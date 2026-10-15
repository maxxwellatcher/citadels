export type Pairing = { kind: 'offer' | 'answer'; text: string };
type Signal = { v: 1; id: string; room: string; type: 'offer' | 'answer'; sdp: string };

async function encode(signal: Signal) {
  const stream = new Blob([JSON.stringify(signal)]).stream().pipeThrough(new CompressionStream('deflate'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return 'CT1.' + btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
}
async function decode(text: string): Promise<Signal> {
  if (text.length > 24000 || !text.trim().startsWith('CT1.')) throw new Error('无效的配对信息，请导入完整二维码或配对文本。');
  try {
    const bytes = Uint8Array.from(atob(text.trim().slice(4)), char => char.charCodeAt(0));
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 64000) { await reader.cancel(); throw new Error('size'); }
      chunks.push(value);
    }
    const signal = JSON.parse(await new Blob(chunks as BlobPart[]).text());
    if (signal.v !== 1 || !['offer', 'answer'].includes(signal.type) || typeof signal.id !== 'string' || !/^[A-Z0-9]{6}$/.test(signal.room) || typeof signal.sdp !== 'string') throw new Error('format');
    return signal;
  } catch { throw new Error('配对信息损坏或版本不匹配。'); }
}

export class PeerTransport {
  private pc: RTCPeerConnection;
  private id: string = crypto.randomUUID();
  private established = false;
  private channel?: RTCDataChannel;
  private timeout?: number;
  roomCode = '';
  constructor(private opened: (channel: RTCDataChannel) => void, private disconnected: (reason: string) => void, private changed: () => void) {
    // Host candidates only: never contact public STUN/TURN infrastructure.
    this.pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all' });
    this.pc.ondatachannel = event => this.bind(event.channel);
    this.pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(this.pc.connectionState)) {
        this.channel?.close(); this.pc.close(); clearTimeout(this.timeout);
        this.disconnected('直连已断开，请检查热点连接并重新配对。');
      }
      this.changed();
    };
  }
  private bind(channel: RTCDataChannel) {
    this.channel = channel;
    channel.onopen = () => {
      this.established = true; clearTimeout(this.timeout);
      this.opened(channel);
      channel.addEventListener('close', () => this.pc.close(), { once: true });
    };
  }
  private async gather() {
    if (this.pc.iceGatheringState === 'complete') return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('收集本地地址超时，请确认 Wi-Fi 已开启后重试。')); }, 12000);
      const check = () => { if (this.pc.iceGatheringState === 'complete') { cleanup(); resolve(); } };
      const cleanup = () => { clearTimeout(timer); this.pc.removeEventListener('icegatheringstatechange', check); };
      this.pc.addEventListener('icegatheringstatechange', check); check();
    });
    if (!this.pc.localDescription?.sdp.includes('a=candidate:')) throw new Error('浏览器没有提供局域网地址，请检查权限或更换浏览器。');
  }
  private armTimeout() {
    this.timeout = window.setTimeout(() => {
      if (!this.established) {
        this.pc.onconnectionstatechange = null; this.pc.close();
        this.disconnected('配对已超时，请生成新邀请。请确认热点允许设备互通。');
      }
    }, 120000);
  }
  async offer(room: string): Promise<Pairing> {
    this.roomCode = room;
    this.bind(this.pc.createDataChannel('citadels', { ordered: true }));
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await this.gather(); this.armTimeout();
    return { kind: 'offer', text: await encode({ v: 1, id: this.id, room, type: 'offer', sdp: this.pc.localDescription!.sdp }) };
  }
  async answer(text: string): Promise<Pairing> {
    const signal = await decode(text);
    if (signal.type !== 'offer') throw new Error('加入者需要导入房主的邀请，而不是回复。');
    this.id = signal.id; this.roomCode = signal.room;
    await this.pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await this.gather(); this.armTimeout();
    return { kind: 'answer', text: await encode({ v: 1, id: this.id, room: signal.room, type: 'answer', sdp: this.pc.localDescription!.sdp }) };
  }
  async accept(text: string) {
    const signal = await decode(text);
    if (signal.type !== 'answer' || signal.id !== this.id || signal.room !== this.roomCode) throw new Error('回复与当前邀请不匹配，请使用同一次配对生成的回复。');
    await this.pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
  }
  cancel() { if (!this.established) { clearTimeout(this.timeout); this.pc.onconnectionstatechange = null; this.pc.close(); } }
}
