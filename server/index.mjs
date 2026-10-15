import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { randomBytes } from 'node:crypto';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  CHARACTERS, createGame, chooseCharacter, takeCoins, drawCards,
  chooseDistrictCard, build, useCharacterAbility, endTurn, aiAct,
  abilityIsUsed, canDestroyDistrict, beginTurn,
} from '../server-build/game.js';

const characterIds = CHARACTERS.map(character => character.id);
const validCharacter = value => typeof value === 'string' && characterIds.includes(value);
const integer = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
const cleanName = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) : '';
const copy = value => JSON.parse(JSON.stringify(value));
const distDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function orientations(state, isPicker) {
  return Object.fromEntries(characterIds.map(id => [id, state.removedFaceUp.includes(id) ? 'dark' : isPicker && state.rolePool.includes(id) ? 'front' : 'back']));
}

/** Produce a fresh view; hidden state is never sent to the browser. */
export function projectState(state, viewerId) {
  if (!state) return null;
  const view = copy(state);
  view.deckCount = state.deck.length;
  view.deck = [];
  view.discard = [];
  view.log = [];
  const knownRoles = new Set(state.revealed);
  const ownRole = state.players[viewerId]?.character;
  if (ownRole) knownRoles.add(ownRole);
  view.chosen = state.chosen.filter(id => knownRoles.has(id));
  view.rolePool = state.phase === 'choose' && state.picker === viewerId ? [...state.rolePool] : [];
  view.players.forEach(player => {
    const source = state.players[player.id];
    player.handCount = source.hand.length;
    player.roleSelected = !!source.character;
    if (player.id !== viewerId) {
      player.hand = [];
      if (!source.character || !state.revealed.includes(source.character)) delete player.character;
      // Selection and hand exchange details are private. Public cities, coins,
      // current phase and announced skill targets carry all shared information.
      player.lastAction = '';
    }
  });
  if (state.pendingDistrictChoice) view.pendingDistrictPlayer = state.pendingDistrictChoice.player;
  if (state.pendingDistrictChoice?.player !== viewerId) delete view.pendingDistrictChoice;
  view.allowedDestroyTargets = [];
  if (state.phase === 'build' && state.currentPlayer === viewerId && state.players[viewerId]?.character === '领主') {
    for (const player of state.players) player.city.forEach((_district, district) => {
      if (canDestroyDistrict(state, viewerId, player.id, district)) view.allowedDestroyTargets.push({ player: player.id, district });
    });
  }
  return view;
}

function generatedCode(rooms) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from(randomBytes(6), value => alphabet[value % alphabet.length]).join(''); } while (rooms.has(code));
  return code;
}

export function createOnlineServer({ port = Number(process.env.PORT || 5174), host = process.env.HOST || '0.0.0.0', aiDelay = 700 } = {}) {
  const rooms = new Map();
  const sockets = new Set();
  let closing = false;
  const server = http.createServer(async (request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400).end(); return; }
    if (pathname === '/online/health') {
      const actualPort = server.address()?.port || port;
      const addresses = Object.values(networkInterfaces()).flat().filter(entry => entry && entry.family === 'IPv4' && !entry.internal).map(entry => entry.address);
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ ok: true, port: actualPort, addresses, urls: addresses.map(address => `http://${address}:${actualPort}/`) }));
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
    const filePath = resolve(distDirectory, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filePath.startsWith(distDirectory + sep)) { response.writeHead(403).end(); return; }
    let selected = filePath;
    try {
      if (!(await stat(selected)).isFile()) selected = resolve(distDirectory, 'index.html');
    } catch { selected = resolve(distDirectory, 'index.html'); }
    try {
      const data = await readFile(selected);
      response.writeHead(200, { 'Content-Type': contentTypes[extname(selected)] || 'application/octet-stream', 'Cache-Control': extname(selected) === '.html' ? 'no-cache' : 'public, max-age=3600' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('客户端尚未构建。请运行 npm run build。');
    }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 });
  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url, 'http://localhost').pathname !== '/online') { socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, client => wss.emit('connection', client, request));
  });

  function send(socket, message) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }
  function fail(socket, message, actionId, code) { send(socket, { type: 'error', message, ...(actionId ? { actionId } : {}), ...(code ? { code } : {}) }); }
  function memberOf(socket) { return socket.room?.members.find(member => member.token === socket.token); }
  function freezePicker(room) {
    const state = room.state;
    if (state?.phase !== 'choose') return;
    const member = room.members.find(candidate => candidate.id === state.picker);
    if (member && member.roleRound !== state.round) {
      member.roleRound = state.round;
      member.roleStatuses = orientations(state, true);
    }
  }
  function updateTurns(room) {
    const state = room.state;
    if (!state) return;
    // Let the engine prepare role effects exactly once, including the crown
    // and theft before income. Murdered roles advance without revealing them.
    let remaining = state.players.length;
    while (state.phase === 'income' && remaining-- > 0 && !beginTurn(state)) {}
    room.status = state.phase === 'ended' ? 'ended' : 'playing';
    freezePicker(room);
  }
  function roomView(room, member) {
    const state = room.state;
    const roleStatuses = state ? member.roleRound === state.round && member.roleStatuses ? member.roleStatuses : orientations(state, false) : undefined;
    return {
      code: room.code, hostId: room.hostId, capacity: room.capacity, aiCount: room.aiCount,
      revision: room.revision, status: room.status,
      members: room.members.map(({ id, name, ready, socket }) => ({ id, name, ready, connected: socket?.readyState === WebSocket.OPEN })),
      state: projectState(state, member.id), viewerId: member.id,
      ...(roleStatuses ? { roleStatuses } : {}),
    };
  }
  function broadcast(room, message) { room.members.forEach(member => send(member.socket, message)); }
  function clearArrows(room) {
    for (const member of room.members) if (member.arrowActive) {
      member.arrowActive = false;
      broadcast(room, { type: 'arrow', playerId: member.id, active: false });
    }
  }
  function publish(room) {
    updateTurns(room);
    room.members.forEach(member => send(member.socket, { type: 'room', room: roomView(room, member) }));
    // Events are delivered in the same update to every seat and are never
    // replayed on reconnect or another unrelated lobby update.
    if (room.state) room.state.drawEvents = [];
    scheduleAi(room);
  }
  function scheduleAi(room) {
    clearTimeout(room.timer);
    const state = room.state;
    if (!state || state.phase === 'ended' || closing) return;
    const player = state.players[state.phase === 'choose' ? state.picker : state.currentPlayer];
    if (!player || player.human) return;
    room.timer = setTimeout(() => {
      if (closing || room.state !== state) return;
      if (state.phase === 'choose') {
        const candidates = state.rolePool;
        if (candidates.length) chooseCharacter(state, state.picker, candidates[Math.floor(Math.random() * candidates.length)]);
      } else {
        if (state.pendingDistrictChoice?.player === state.currentPlayer) chooseDistrictCard(state, 0);
        aiAct(state);
      }
      room.revision++;
      clearArrows(room);
      publish(room);
    }, Math.max(0, aiDelay));
    room.timer.unref?.();
  }
  function bind(socket, room, member) {
    if (member.socket && member.socket !== socket) {
      const previous = member.socket;
      previous.room = null;
      previous.token = null;
      previous.close(4001, '此席位已在另一个窗口恢复');
    }
    socket.room = room;
    socket.token = member.token;
    member.socket = socket;
    room.lastActivity = Date.now();
    send(socket, { type: 'session', code: room.code, token: member.token, playerId: member.id });
  }
  function detach(socket, explicit = false) {
    const room = socket.room;
    const member = memberOf(socket);
    socket.room = null;
    socket.token = null;
    if (!room || !member || member.socket !== socket) return;
    if (member.arrowActive) broadcast(room, { type: 'arrow', playerId: member.id, active: false });
    member.arrowActive = false;
    member.socket = null;
    member.ready = false;
    if (explicit && room.status === 'lobby') {
      const hostToken = room.members.find(candidate => candidate.id === room.hostId)?.token;
      room.members = room.members.filter(candidate => candidate !== member);
      room.members.forEach((candidate, index) => {
        candidate.id = index;
        send(candidate.socket, { type: 'session', code: room.code, token: candidate.token, playerId: index });
      });
      room.hostId = room.members.find(candidate => candidate.token === hostToken)?.id ?? room.members.find(candidate => candidate.socket)?.id ?? 0;
    } else if (explicit && room.state) {
      // Explicit leave abandons the seat; a transient connection loss does not.
      const player = room.state.players[member.id];
      if (player) { player.human = false; player.name = `${member.name}（AI）`; }
      room.members = room.members.filter(candidate => candidate !== member);
      member.token = null;
      room.aiCount++;
      if (room.hostId === member.id) room.hostId = room.members.find(candidate => candidate.socket?.readyState === WebSocket.OPEN)?.id ?? room.members[0]?.id ?? 0;
    }
    if (room.members.find(candidate => candidate.id === room.hostId)?.socket?.readyState !== WebSocket.OPEN) {
      room.hostId = room.members.find(candidate => candidate.socket?.readyState === WebSocket.OPEN)?.id ?? room.hostId;
    }
    room.revision++;
    room.lastActivity = Date.now();
    if (!room.members.length) { clearTimeout(room.timer); rooms.delete(room.code); } else publish(room);
  }

  function validTarget(target, state, playerId) {
    if (target === undefined) return true;
    if (validCharacter(target)) return true;
    if (target === null || typeof target !== 'object' || Array.isArray(target)) return false;
    if ('cards' in target) {
      const handLength = state.players[playerId]?.hand.length ?? 0;
      return !('player' in target) && !('district' in target)
        && Array.isArray(target.cards) && target.cards.length > 0
        && target.cards.length <= handLength && new Set(target.cards).size === target.cards.length
        && target.cards.every(index => integer(index, 0, handLength - 1));
    }
    return integer(target.player, 0, state.players.length - 1)
      && (target.district === undefined || integer(target.district, 0, state.players[target.player].city.length - 1));
  }
  function perform(state, playerId, action) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) return false;
    if (action.kind === 'choose') return validCharacter(action.character) && chooseCharacter(state, playerId, action.character);
    if (state.currentPlayer !== playerId) return false;
    switch (action.kind) {
      case 'coins': return state.phase === 'income' && takeCoins(state);
      case 'cards': return state.phase === 'income' && drawCards(state);
      case 'district': return integer(action.index, 0, (state.pendingDistrictChoice?.cards.length ?? 0) - 1) && state.pendingDistrictChoice?.player === playerId && chooseDistrictCard(state, action.index);
      case 'build': return integer(action.index, 0, state.players[playerId].hand.length - 1) && build(state, playerId, action.index);
      case 'ability': return integer(action.index, 0, 1) && validTarget(action.target, state, playerId) && useCharacterAbility(state, playerId, action.index, action.target);
      case 'end': if (state.phase !== 'build' || state.pendingDistrictChoice) return false; endTurn(state); return true;
      default: return false;
    }
  }

  wss.on('connection', socket => {
    sockets.add(socket);
    socket.alive = true;
    socket.budget = { since: Date.now(), messages: 0 };
    socket.on('pong', () => { socket.alive = true; });
    socket.on('error', () => {});
    socket.on('message', raw => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { fail(socket, '消息格式错误'); return; }
      if (!message || typeof message !== 'object' || Array.isArray(message)) { fail(socket, '消息格式错误'); return; }
      const now = Date.now();
      if (now - socket.budget.since > 1000) socket.budget = { since: now, messages: 0 };
      if (++socket.budget.messages > 120) { fail(socket, '操作过于频繁'); return; }
      if (message.type === 'create') {
        if (socket.room) { fail(socket, '请先离开当前房间'); return; }
        const name = cleanName(message.name);
        if (!name || !integer(message.capacity, 2, 8) || !integer(message.aiCount, 0, message.capacity - 1)) { fail(socket, '请输入昵称、2 至 8 人房间及合理的 AI 数量'); return; }
        const code = generatedCode(rooms);
        const member = { id: 0, name, ready: false, token: randomBytes(32).toString('hex'), socket: null, actions: new Map() };
        const room = { code, hostId: 0, capacity: message.capacity, aiCount: message.aiCount, revision: 1, status: 'lobby', members: [member], state: null, lastActivity: now };
        rooms.set(code, room);
        bind(socket, room, member);
        publish(room);
        return;
      }
      if (message.type === 'join') {
        if (socket.room) { fail(socket, '请先离开当前房间'); return; }
        const room = typeof message.code === 'string' ? rooms.get(message.code.trim().toUpperCase()) : null;
        const name = cleanName(message.name);
        if (!room) { fail(socket, '房间不存在，请检查房间码'); return; }
        if (!name) { fail(socket, '请输入玩家昵称'); return; }
        if (room.status !== 'lobby') { fail(socket, '对局已经开始，请使用原席位重连'); return; }
        if (room.members.length + room.aiCount >= room.capacity) { fail(socket, '房间已满'); return; }
        const member = { id: room.members.length, name, ready: false, token: randomBytes(32).toString('hex'), socket: null, actions: new Map() };
        room.members.push(member);
        room.revision++;
        bind(socket, room, member);
        publish(room);
        return;
      }
      if (message.type === 'resume') {
        if (socket.room) { fail(socket, '已经在房间中'); return; }
        const room = typeof message.code === 'string' ? rooms.get(message.code.trim().toUpperCase()) : null;
        const member = typeof message.token === 'string' ? room?.members.find(candidate => candidate.token === message.token) : null;
        if (!room || !member) { fail(socket, '原房间或席位已失效', undefined, 'invalid_session'); return; }
        bind(socket, room, member);
        room.revision++;
        publish(room);
        return;
      }
      if (message.type === 'leave') { detach(socket, true); send(socket, { type: 'left' }); return; }
      const room = socket.room;
      const member = memberOf(socket);
      if (!room || !member) { fail(socket, '请先创建或加入房间'); return; }
      room.lastActivity = now;
      if (message.type === 'ready') {
        if (room.status !== 'lobby' || typeof message.ready !== 'boolean') { fail(socket, '当前无法修改准备状态'); return; }
        member.ready = message.ready;
        room.revision++;
        publish(room);
        return;
      }
      if (message.type === 'start') {
        if (member.id !== room.hostId || room.status !== 'lobby') { fail(socket, '只有房主可以开始对局'); return; }
        if (room.members.length + room.aiCount < 2 || room.members.some(candidate => !candidate.ready || candidate.socket?.readyState !== WebSocket.OPEN)) { fail(socket, '至少两位玩家且所有真人准备后才能开始'); return; }
        room.state = createGame(room.members.length + room.aiCount, room.members.length);
        room.members.forEach(candidate => { room.state.players[candidate.id].name = candidate.name; candidate.roleRound = 0; candidate.actions.clear(); });
        room.status = 'playing';
        room.revision++;
        publish(room);
        return;
      }
      if (message.type === 'rematch') {
        if (member.id !== room.hostId || room.status !== 'ended') { fail(socket, '对局结束后房主才能再来一局'); return; }
        clearTimeout(room.timer);
        room.state = null;
        room.status = 'lobby';
        const hostToken = room.members.find(candidate => candidate.id === room.hostId)?.token;
        room.members.forEach((candidate, index) => {
          candidate.id = index;
          candidate.ready = false;
          candidate.actions.clear();
          candidate.roleRound = 0;
          send(candidate.socket, { type: 'session', code: room.code, token: candidate.token, playerId: index });
        });
        room.hostId = room.members.find(candidate => candidate.token === hostToken)?.id ?? 0;
        room.revision++;
        clearArrows(room);
        publish(room);
        return;
      }
      if (message.type === 'action') {
        const id = message.id;
        if (typeof id !== 'string' || !id.length || id.length > 100) { fail(socket, '操作编号错误'); return; }
        if (member.actions.has(id)) {
          send(socket, { type: 'ack', id });
          const snapshot = roomView(room, member);
          if (snapshot.state) snapshot.state.drawEvents = [];
          send(socket, { type: 'room', room: snapshot });
          return;
        }
        if (room.status !== 'playing' || !room.state) { fail(socket, '对局尚未开始或已经结束', id); return; }
        if (message.revision !== room.revision) { fail(socket, '局面已经更新，请按最新局面操作', id); send(socket, { type: 'room', room: roomView(room, member) }); return; }
        if (!perform(room.state, member.id, message.action)) { fail(socket, '当前不能执行这项操作，请检查回合、目标或资源', id); return; }
        member.actions.set(id, true);
        if (member.actions.size > 256) member.actions.delete(member.actions.keys().next().value);
        room.revision++;
        clearArrows(room);
        send(socket, { type: 'ack', id });
        publish(room);
        return;
      }
      if (message.type === 'arrow') {
        if (typeof message.active !== 'boolean') return;
        const state = room.state;
        if (!message.active) {
          if (member.arrowActive) { member.arrowActive = false; broadcast(room, { type: 'arrow', playerId: member.id, active: false }); }
          return;
        }
        const player = state?.players[member.id];
        const targeted = player && ((['刺客', '盗贼', '魔法师'].includes(player.character) && message.index === 0) || (player.character === '领主' && message.index === 1 && state.phase === 'build'));
        if (room.status !== 'playing' || !['income', 'build'].includes(state.phase) || state.currentPlayer !== member.id || state.pendingDistrictChoice || !targeted || abilityIsUsed(player, message.index)) return;
        const point = value => value && typeof value === 'object' && Number.isFinite(value.x) && Number.isFinite(value.y) && value.x >= 0 && value.x <= 1 && value.y >= 0 && value.y <= 1;
        if (!point(message.from) || !point(message.to)) return;
        member.arrowActive = true;
        const target = validTarget(message.target, state, member.id) && (typeof message.target === 'string' || message.target && !('cards' in message.target)) ? message.target : undefined;
        broadcast(room, {
          type: 'arrow', playerId: member.id, active: true,
          from: { x: message.from.x, y: message.from.y }, to: { x: message.to.x, y: message.to.y },
          index: message.index,
          ...(target === undefined ? {} : { target: typeof target === 'string' ? target : { player: target.player, ...(target.district === undefined ? {} : { district: target.district }) } }),
        });
      }
    });
    socket.on('close', () => { sockets.delete(socket); detach(socket); });
  });

  const heartbeat = setInterval(() => {
    for (const socket of sockets) {
      if (!socket.alive) { socket.terminate(); continue; }
      socket.alive = false;
      socket.ping();
    }
    for (const [code, room] of rooms) if (Date.now() - room.lastActivity > 24 * 60 * 60 * 1000 && room.members.every(member => !member.socket)) { clearTimeout(room.timer); rooms.delete(code); }
  }, 30_000);
  heartbeat.unref();
  return {
    server, wss, rooms,
    listen: () => new Promise((resolveListen, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => { server.off('error', reject); resolveListen(server.address()); });
    }),
    close: async () => {
      closing = true;
      clearInterval(heartbeat);
      rooms.forEach(room => clearTimeout(room.timer));
      sockets.forEach(socket => socket.terminate());
      await new Promise(resolveClose => wss.close(resolveClose));
      if (server.listening) await new Promise(resolveClose => server.close(resolveClose));
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const online = createOnlineServer();
  const address = await online.listen();
  console.log(`富饶之城在线服务器：http://127.0.0.1:${address.port}/`);
  console.log('开发页面可继续从 http://127.0.0.1:5173/ 访问。局域网玩家可使用 /online/health 返回的地址。');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await online.close(); process.exit(0); });
}
