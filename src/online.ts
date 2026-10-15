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

// Session tokens stay in this tab. An invitation only shares the public room
// code. An invitation does not contain the credential for an existing seat.
export class OnlineClient {
  room: Room | null = null;
  status: ConnectionStatus = 'offline';
  pending = false;
  private socket: WebSocket | null = null;
  private session: Session | null = null;
  private reconnectTimer?: number;
  private reconnectAttempts = 0;
  private stopping = false;
  private leaving = false;
  private leaveSent = false;
  private queued: Record<string, unknown> | null = null;
  private pendingId: string | null = null;
  private requestTimer?: number;
  constructor(private changed: () => void, private failure: (message: string) => void, private arrowReceived: (arrow: Arrow) => void) {
    try { this.session = JSON.parse(sessionStorage.getItem('citadels-online-session') ?? 'null'); } catch { this.clearSession(); }
  }
  get playerId() { return this.room?.viewerId ?? this.session?.playerId; }
  get hasSession() { return !!this.session; }
  connect() {
    this.stopping = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    this.status = this.session ? 'reconnecting' : 'connecting';
    this.changed();
    const url = new URL('/online', location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.status = this.session ? 'reconnecting' : 'connected'; this.reconnectAttempts = 0;
      if (this.session) this.send({ type: 'resume', code: this.session.code, token: this.session.token });
      else if (this.queued) { this.send(this.queued); this.queued = null; }
      this.changed();
    };
    socket.onmessage = event => {
      if (this.socket !== socket) return;
      let message: any; try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.type === 'session') {
        this.session = { code: message.code, token: message.token, playerId: message.playerId };
        sessionStorage.setItem('citadels-online-session', JSON.stringify(this.session));
      } else if (message.type === 'room') {
        this.room = message.room;
        this.status = 'connected';
        if (this.leaving) {
          this.pending = true;
          if (!this.leaveSent) { this.leaveSent = true; this.send({ type: 'leave' }); }
        } else if (!this.pendingId) this.clearPending();
        this.changed();
      } else if (message.type === 'left') {
        this.finishLeave();
      } else if (message.type === 'ack') {
        // The ack is followed by a room snapshot. Keep controls locked until
        // that snapshot arrives so a second click cannot use the old revision.
        if (message.id === this.pendingId) this.pendingId = null;
      } else if (message.type === 'arrow') this.arrowReceived(message);
      else if (message.type === 'error') {
        this.clearPending();
        if (message.code === 'session_expired' || message.code === 'room_not_found' || message.code === 'invalid_session') { this.finishLeave(); }
        this.failure(message.message ?? '操作未完成，请重试。');
      }
    };
    socket.onclose = event => {
      if (this.socket !== socket) return;
      this.socket = null; this.clearPending();
      this.leaveSent = false;
      if (event.code === 4001) {
        this.finishLeave(); this.failure('此席位已在另一个窗口恢复。'); return;
      }
      if (this.stopping) return;
      this.status = this.session ? 'reconnecting' : 'offline'; this.changed();
      if (this.session) this.reconnectTimer = window.setTimeout(() => this.connect(), Math.min(10000, 800 * 2 ** this.reconnectAttempts++));
      else this.failure('连接不到在线服务，请稍后重试。');
    };
    socket.onerror = () => { /* onclose owns reconnection and status feedback. */ };
  }
  request(message: Record<string, unknown>) {
    if (this.pending) return false;
    this.pending = true;
    if (this.socket?.readyState === WebSocket.OPEN) this.send(message);
    else { this.queued = message; this.connect(); }
    this.requestTimer = window.setTimeout(() => { this.clearPending(); this.failure('请求超时，请检查连接后重试。'); }, 10000);
    this.changed(); return true;
  }
  action(action: GameAction) {
    if (!this.room || this.status !== 'connected' || this.pending) return false;
    // randomUUID requires HTTPS outside localhost; LAN HTTP must work too.
    this.pendingId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    return this.request({ type: 'action', id: this.pendingId, revision: this.room.revision, action });
  }
  arrow(active: boolean, index: 0 | 1, from?: { x: number; y: number }, to?: { x: number; y: number }, target?: AbilityTarget) {
    if (this.room && this.status === 'connected') this.send({ type: 'arrow', active, index, from, to, target });
  }
  leave() {
    if (!this.session && !this.room) { this.finishLeave(); return; }
    this.leaving = true; this.clearPending(); this.pending = true; this.queued = null;
    if (this.socket?.readyState === WebSocket.OPEN && this.status === 'connected') {
      this.leaveSent = true; this.send({ type: 'leave' });
    } else this.connect();
    this.changed();
  }
  private finishLeave() {
    this.stopping = true; this.leaving = false; this.leaveSent = false;
    window.clearTimeout(this.reconnectTimer);
    this.socket?.close(); this.socket = null; this.room = null; this.queued = null;
    this.clearSession(); this.clearPending(); this.status = 'offline'; this.changed();
  }
  private send(message: Record<string, unknown>) { this.socket?.send(JSON.stringify(message)); }
  private clearPending() { window.clearTimeout(this.requestTimer); this.pending = false; this.pendingId = null; }
  private clearSession() { this.session = null; sessionStorage.removeItem('citadels-online-session'); }
}
