export interface HostSocket {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: string, callback: (...args: any[]) => void): void;
}
export function createRoomHost(options?: { aiDelay?: number; storage?: Pick<Storage, 'getItem' | 'setItem'> }): {
  attach(socket: HostSocket): void;
  close(): void;
};
export function projectState(state: import('./game').GameState, viewerId: number): import('./game').GameState;
