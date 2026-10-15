import type { AbilityTarget, CharacterId, GameState } from './game';

export type RoleFaces = Record<CharacterId, 'front' | 'dark' | 'back'>;
export type Room = {
  code: string; hostId: number; capacity: number; aiCount: number; revision: number;
  status: 'lobby' | 'playing' | 'ended'; viewerId: number;
  members: { id: number; name: string; ready: boolean; connected: boolean }[];
  state: (GameState & { deckCount?: number; pendingDistrictPlayer?: number; allowedDestroyTargets?: { player: number; district: number }[] }) | null;
  roleStatuses?: RoleFaces;
};
export type GameAction =
  | { kind: 'choose'; character: CharacterId }
  | { kind: 'coins' | 'cards' | 'end' }
  | { kind: 'district' | 'build'; index: number }
  | { kind: 'ability'; index: 0 | 1; target?: AbilityTarget };
export type Arrow = { type: 'arrow'; playerId: number; active: boolean; index: 0 | 1; from?: { x: number; y: number }; to?: { x: number; y: number }; target?: AbilityTarget };
export type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'reconnecting';
type Session = { code: string; token: string; playerId: number };

// The room authority lives in the host page; no network server is involved.
import { createRoomHost, type HostSocket } from './roomHost';
import { PeerTransport, type Pairing } from './peerTransport';

export class OnlineClient {
  room: Room | null = null;
  status: ConnectionStatus = 'offline';
  pending = false;
  pairing: Pairing | null = null;
  isHost = false;
  private session: Session | null = null;
  private host?: ReturnType<typeof createRoomHost>;
  private local?: LocalSocket;
  private peer?: PeerTransport;
  private channels = new Set<RTCDataChannel>();
  private activeChannel?: RTCDataChannel;
  private requestTimer?: number;
  private pendingId: string | null = null;
  private sendMessage?: (message: Record<string, unknown>) => void;
  constructor(private changed: () => void, private failure: (message: string) => void, private arrowReceived: (arrow: Arrow) => void) {
    try {
      const hostSession = localStorage.getItem('citadels-host-session-v1');
      this.isHost = !!hostSession;
      this.session = JSON.parse(hostSession || sessionStorage.getItem('citadels-peer-session-v1') || 'null');
    } catch { this.clearSession(); }
  }
  get playerId() { return this.room?.viewerId ?? this.session?.playerId; }
  get hasSession() { return !!this.session; }
  connect() {
    if (this.isHost && this.session && !this.local) {
      this.startHost();
      this.request({ type: 'resume', code: this.session.code, token: this.session.token });
    } else if (!this.isHost) {
      this.status = 'reconnecting'; this.changed();
      this.failure('请向房主获取新的邀请，重新配对即可恢复原席位。');
    }
  }
  private startHost() {
    this.host = createRoomHost();
    this.local = new LocalSocket(data => this.receive(data));
    this.host.attach(this.local);
    this.sendMessage = message => this.local?.emit('message', JSON.stringify(message));
    this.status = 'connected';
  }
  request(message: Record<string, unknown>) {
    if (this.pending) return false;
    if (message.type === 'create') {
      if (this.session) return false;
      this.isHost = true; this.startHost();
    }
    if (!this.sendMessage) { this.failure('请先完成离线配对。'); return false; }
    this.pending = true;
    this.requestTimer = window.setTimeout(() => {
      this.clearPending(); this.failure('请求超时，请重新配对并检查最新局面。'); this.changed();
    }, 10000);
    // Local delivery is queued so actions have the same ordering as remote delivery.
    this.sendMessage(message); this.changed(); return true;
  }
  action(action: GameAction) {
    if (!this.room || this.status !== 'connected' || this.pending) return false;
    this.pendingId = crypto.randomUUID();
    return this.request({ type: 'action', id: this.pendingId, revision: this.room.revision, action });
  }
  arrow(active: boolean, index: 0 | 1, from?: { x: number; y: number }, to?: { x: number; y: number }, target?: AbilityTarget) {
    if (this.status === 'connected') this.sendMessage?.({ type: 'arrow', active, index, from, to, target });
  }
  async invite() {
    if (!this.isHost || !this.host || !this.room) throw new Error('只有房主可以生成邀请。');
    this.cancelPairing();
    const peer = new PeerTransport(channel => this.attachGuest(channel), reason => {
      if (this.peer !== peer || !this.pairing) return;
      this.pairing = null; this.failure(reason); this.changed();
    }, () => this.changed());
    this.peer = peer;
    try { this.pairing = await peer.offer(this.room.code); }
    catch (error) { peer.cancel(); throw error; }
    this.changed();
  }
  async pair(text: string, name: string) {
    if (this.isHost) {
      if (!this.peer || !this.pairing) throw new Error('请先生成邀请，再导入该玩家的回复。');
      await this.peer.accept(text);
      return;
    }
    if (!name.trim()) throw new Error('请输入玩家昵称。');
    if (this.status === 'connected') throw new Error('请先离开当前房间。');
    this.cancelPairing();
    this.activeChannel = undefined;
    this.channels.forEach(channel => channel.close()); this.channels.clear();
    this.status = this.session ? 'reconnecting' : 'connecting';
    const peer = new PeerTransport(channel => {
      if (this.peer !== peer) { channel.close(); return; }
      this.channels.add(channel); this.activeChannel = channel;
      this.sendMessage = message => {
        if (channel.readyState !== 'open') return;
        channel.send(JSON.stringify(message));
      };
      channel.onmessage = event => this.receive(String(event.data));
      channel.onclose = () => { if (this.activeChannel === channel) this.disconnected(); };
      this.pairing = null;
      this.status = 'connected';
      this.request(this.session
        ? { type: 'resume', code: this.session.code, token: this.session.token }
        : { type: 'join', code: peer.roomCode, name: name.trim() });
    }, reason => {
      if (this.peer !== peer) return;
      this.disconnected(); this.failure(reason);
    }, () => this.changed());
    this.peer = peer;
    try { this.pairing = await peer.answer(text); }
    catch (error) {
      peer.cancel(); this.status = this.session ? 'reconnecting' : 'offline'; this.changed(); throw error;
    }
    this.changed();
  }
  cancelPairing() {
    // An established channel belongs to the room, not to the pairing panel.
    this.peer?.cancel(); this.peer = undefined; this.pairing = null; this.changed();
  }
  private attachGuest(channel: RTCDataChannel) {
    this.channels.add(channel);
    const socket = new LocalSocket(data => { if (channel.readyState === 'open') channel.send(data); });
    this.host!.attach(socket);
    channel.onmessage = event => {
      if (typeof event.data !== 'string' || event.data.length > 32768) { channel.close(); return; }
      socket.emit('message', event.data);
    };
    channel.onclose = () => { socket.close(); this.channels.delete(channel); };
    socket.closed = () => channel.close();
    this.pairing = null; this.changed();
  }
  private disconnected() {
    if (this.isHost) return;
    this.status = this.session ? 'reconnecting' : 'offline';
    this.sendMessage = undefined; this.clearPending(); this.changed();
  }
  private receive(data: string) {
    let message: any;
    try { message = JSON.parse(data); } catch { return; }
    if (message.type === 'session') {
      this.session = { code: message.code, token: message.token, playerId: message.playerId };
      (this.isHost ? localStorage : sessionStorage).setItem(this.isHost ? 'citadels-host-session-v1' : 'citadels-peer-session-v1', JSON.stringify(this.session));
    } else if (message.type === 'room') {
      this.room = message.room; this.status = 'connected';
      if (!this.pendingId) this.clearPending();
      this.changed();
    } else if (message.type === 'ack') {
      if (message.id === this.pendingId) this.pendingId = null;
    } else if (message.type === 'arrow') this.arrowReceived(message);
    else if (message.type === 'left') this.finishLeave();
    else if (message.type === 'error') {
      this.clearPending();
      if (message.code === 'invalid_session') this.finishLeave();
      this.failure(message.message || '操作失败'); this.changed();
    }
  }
  leave() {
    if (this.isHost || this.status !== 'connected') this.finishLeave();
    else this.request({ type: 'leave' });
  }
  private finishLeave() {
    const wasHost = this.isHost;
    this.sendMessage = undefined; this.activeChannel = undefined;
    this.peer?.cancel(); this.peer = undefined;
    this.channels.forEach(channel => channel.close()); this.channels.clear();
    this.host?.close(); this.host = undefined; this.local = undefined;
    if (wasHost) localStorage.removeItem('citadels-host-v1');
    this.clearSession(); this.isHost = false; this.room = null; this.pairing = null;
    this.status = 'offline'; this.clearPending(); this.changed();
  }
  private clearPending() { clearTimeout(this.requestTimer); this.pending = false; this.pendingId = null; }
  private clearSession() {
    this.session = null;
    localStorage.removeItem('citadels-host-session-v1');
    sessionStorage.removeItem('citadels-peer-session-v1');
  }
}

class LocalSocket implements HostSocket {
  readyState = 1;
  closed?: () => void;
  private listeners = new Map<string, ((...args: any[]) => void)[]>();
  constructor(private deliver: (data: string) => void) {}
  on(event: string, callback: (...args: any[]) => void) {
    this.listeners.set(event, [...(this.listeners.get(event) || []), callback]);
  }
  emit(event: string, ...args: any[]) { this.listeners.get(event)?.forEach(callback => callback(...args)); }
  send(data: string) { queueMicrotask(() => { if (this.readyState === 1) this.deliver(data); }); }
  close() { if (this.readyState !== 1) return; this.readyState = 3; this.emit('close'); this.closed?.(); }
}
