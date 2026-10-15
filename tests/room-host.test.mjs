import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoomHost } from '../src/roomHost.js';

class Socket {
  readyState = 1;
  messages = [];
  handlers = new Map();
  on(event, callback) { this.handlers.set(event, callback); }
  send(data) { this.messages.push(JSON.parse(data)); }
  receive(message) { this.handlers.get('message')(JSON.stringify(message)); }
  close() { this.readyState = 3; this.handlers.get('close')?.(); }
  get roomView() { return this.messages.filter(message => message.type === 'room').at(-1)?.room; }
  get session() { return this.messages.find(message => message.type === 'session'); }
}
function setup() {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const host = createRoomHost({ storage });
  const a = new Socket(), b = new Socket();
  host.attach(a); host.attach(b);
  a.receive({ type: 'create', name: 'Host', capacity: 2, aiCount: 0 });
  b.receive({ type: 'join', name: 'Guest', code: a.roomView.code });
  return { host, a, b, storage };
}
function start(a, b) {
  a.receive({ type: 'ready', ready: true }); b.receive({ type: 'ready', ready: true });
  a.receive({ type: 'start' });
}

test('host validates readiness and filters each player snapshot before transmission', () => {
  const { host, a, b } = setup();
  a.receive({ type: 'start' });
  assert.equal(a.messages.at(-1).type, 'error');
  start(a, b);
  assert.equal(a.roomView.status, 'playing');
  for (const [socket, self, other] of [[a, 0, 1], [b, 1, 0]]) {
    const state = socket.roomView.state;
    assert.equal(state.players[self].hand.length, 4);
    assert.equal(state.players[other].hand.length, 0);
    assert.equal(state.players[other].handCount, 4);
    assert.equal(state.deck.length, 0);
    assert.equal(state.log.length, 0);
    assert.ok(!JSON.stringify(socket.roomView).includes(socket.session.token));
  }
  host.close();
});

test('stale revisions and out-of-turn actions fail; duplicate action IDs do not execute twice', () => {
  const { host, a, b } = setup(); start(a, b);
  const picker = a.roomView.state.picker === 0 ? a : b;
  const other = picker === a ? b : a;
  const action = { kind: 'choose', character: picker.roomView.state.rolePool[0] };
  const revision = picker.roomView.revision;
  other.receive({ type: 'action', id: 'wrong-seat', revision, action });
  assert.equal(other.messages.at(-1).type, 'error');
  picker.receive({ type: 'action', id: 'stale', revision: revision - 1, action });
  assert.ok(picker.messages.some(message => message.actionId === 'stale'));
  picker.receive({ type: 'action', id: 'once', revision, action });
  assert.equal(picker.roomView.revision, revision + 1);
  picker.receive({ type: 'action', id: 'once', revision, action });
  assert.equal(picker.roomView.revision, revision + 1);
  host.close();
});

test('host refresh restores the game and guest resumes the same private seat', () => {
  const { host, a, b, storage } = setup(); start(a, b);
  const sessionA = a.session, sessionB = b.session;
  const hand = b.roomView.state.players[1].hand;
  host.close();
  const restored = createRoomHost({ storage });
  const newA = new Socket(), newB = new Socket(); restored.attach(newA); restored.attach(newB);
  newA.receive({ type: 'resume', code: sessionA.code, token: sessionA.token });
  assert.equal(newA.roomView.hostId, 0);
  assert.equal(newA.roomView.members[1].connected, false);
  newB.receive({ type: 'resume', code: sessionB.code, token: sessionB.token });
  assert.deepEqual(newB.roomView.state.players[1].hand, hand);
  assert.equal(newB.roomView.members.length, 2);
  assert.equal(newB.roomView.viewerId, 1);
  newB.close();
  assert.equal(newA.roomView.members[1].connected, false);
  assert.equal(newA.roomView.aiCount, 0);
  restored.close();
});

test('wrong session token cannot recover a seat; explicit departure enables AI', () => {
  const { host, a, b } = setup(); start(a, b);
  const stranger = new Socket(); host.attach(stranger);
  stranger.receive({ type: 'resume', code: a.roomView.code, token: 'incorrect' });
  assert.equal(stranger.messages.at(-1).code, 'invalid_session');
  b.receive({ type: 'leave' });
  assert.equal(a.roomView.aiCount, 1);
  assert.equal(a.roomView.state.players[1].human, false);
  host.close();
});
