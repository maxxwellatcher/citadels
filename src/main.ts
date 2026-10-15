import './style.css';
import './uiMotion.css';
import { installHandDrag } from './handDrag';
import { animateRolePicker, closeRolePickerAnimation } from './roleMotion';
import { installRoleHints } from './roleHints';
import './roleHints.css';
import './mobileLayout.css';
import './landscapeLayout.css';
import './homeLayout.css';
import { fullscreenButton, installFullscreen } from './fullscreen';
import { renderRoleIcon as roleIcon } from './roleIcons';
import { renderDistrictIcon as districtIcon } from './districtIcons';
import { renderIncomeIcon as incomeIcon } from './incomeIcons';
import { renderAbilityIcon as abilityIcon } from './abilityIcons';
import { districtType, districtDescription } from './districtDetails';
import {
  CHARACTERS,
  aiAct,
  build,
  chooseCharacter,
  createGame,
  drawCards,
  endTurn,
  chooseDistrictCard,
  takeCoins,
  totalScore,
  useCharacterAbility,
  abilityIsUsed,
  canDestroyDistrict,
  destructionCost,
  beginTurn,
  type CharacterId,
  type District,
  type GameState,
  type Player,
} from './game';
import { OnlineClient, type Arrow, type GameAction, type Room } from './online';

const app = document.querySelector<HTMLDivElement>('#app')!;
let state: GameState | null = null;
let inspectedRole: CharacterId | null = null;
let selectedDistrict: { player: number; index: number } | null = null;
let aiTimer: number | undefined;
let setupPlayers = 4;
let setupHumans = 1;
let roleModalOpen = false;
let roleModalClosing = false;
let roleCloseToken = 0;
let roleAutoPromptKey = '';
type AbilityTargetMode = 'role' | 'player' | 'building' | 'hand';
type PendingAbility = { index: 0 | 1; mode: AbilityTargetMode };
let pendingAbility: PendingAbility | null = null;
const redrawCards = new Set<number>();
let dragState: { index: 0 | 1; mode: AbilityTargetMode; startX: number; startY: number; downX: number; downY: number; pointerId: number; active: boolean } | null = null;
let suppressAbilityClickUntil = 0;
type RoleCardStatus = 'front' | 'dark' | 'back';
type RoleDeckSnapshot = { round: number; statuses: Record<CharacterId, RoleCardStatus> };
// During a round the role picker can be opened again after the human player
// has made a choice. Keep the orientation that was visible at that moment so
// the compact deck trigger and the full modal continue to describe the same
// physical cards instead of revealing cards as AI players pick them.
const roleDeckSnapshots = new Map<number, RoleDeckSnapshot>();
let localViewer = 0;
let mode: 'local' | 'online' = new URLSearchParams(location.search).has('room') ? 'online' : 'local';
let onlineName = localStorage.getItem('citadels-player-name') ?? '';
let onlineCode = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
let onlineCapacity = 4;
let onlineAiCount = 0;
let onlineNotice = '';
let shareOrigin = location.origin;
let lastDrawEvent = 0;
let lastRoomCode = '';
let lastArrowSent = 0;
const remoteArrows = new Map<number, Arrow>();
const online = new OnlineClient(() => {
  if (mode !== 'online') return;
  if (online.room?.code !== lastRoomCode) {
    lastRoomCode = online.room?.code ?? ''; lastDrawEvent = 0; resetOverlays();
  }
  const nextState = online.room?.state ?? null;
  if (state && !nextState) { lastDrawEvent = 0; resetOverlays(); }
  state = nextState;
  if (online.status !== 'connected') clearRemoteArrows();
  if (pendingAbility && (!state || !['income', 'build'].includes(state.phase) || state.currentPlayer !== online.playerId || abilityIsUsed(myPlayer(state)!, pendingAbility.index))) { pendingAbility = null; redrawCards.clear(); }
  render();
}, message => { onlineNotice = message; if (mode === 'online') state = online.room?.state ?? null; render(); }, receiveArrow);

function resetOverlays() {
  roleDeckSnapshots.clear(); localViewer = 0; selectedDistrict = null; inspectedRole = null;
  roleModalOpen = false; roleAutoPromptKey = ''; pendingAbility = null;
  roleModalClosing = false; roleCloseToken++;
  dragState = null; removeAbilityDragArrow(); clearRemoteArrows();
  redrawCards.clear(); choiceFlight = null;
}
function myPlayer(s: GameState) {
  if (mode === 'online') return s.players.find(p => p.id === online.playerId);
  const acting = s.players[s.phase === 'choose' ? s.picker : s.currentPlayer];
  return acting?.human ? acting : s.players.find(p => p.id === localViewer && p.human) ?? s.players.find(p => p.human);
}
function isMine(p?: Player) { return !!p && (mode === 'online' ? p.id === online.playerId : p.human); }
function canAct() { return mode === 'local' || (online.status === 'connected' && !online.pending); }
function handCount(p: Player) { return (p as Player & { handCount?: number }).handCount ?? p.hand.length; }
function performGameAction(action: GameAction): boolean {
  if (!state || !canAct()) return false;
  if (mode === 'online') return online.action(action);
  const actor = action.kind === 'choose' ? state.picker : state.currentPlayer;
  if (!state.players[actor]?.human) return false;
  switch (action.kind) {
    case 'choose': return chooseCharacter(state, actor, action.character);
    case 'coins': return takeCoins(state);
    case 'cards': return drawCards(state);
    case 'district': return chooseDistrictCard(state, action.index);
    case 'build': return build(state, actor, action.index);
    case 'ability': return useCharacterAbility(state, actor, action.index, action.target);
    case 'end': if (state.phase !== 'build' || state.pendingDistrictChoice) return false; endTurn(state); return true;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const current = () => state!.players[state!.currentPlayer];
const roleData = (id?: CharacterId) => CHARACTERS.find(c => c.id === id);
function abilityMode(p: Player, index: 0 | 1): AbilityTargetMode | null {
  if (p.character === '刺客' && index === 0) return 'role';
  if (p.character === '盗贼' && index === 0) return 'role';
  if (p.character === '魔法师' && index === 0) return 'player';
  if (p.character === '魔法师' && index === 1) return 'hand';
  if (p.character === '领主' && index === 1) return 'building';
  return null;
}
function roleTargetAllowed(s: GameState, actor: CharacterId, target: CharacterId) {
  return target !== actor && (actor !== '盗贼' || (target !== '刺客' && target !== s.assassinTarget && !s.removedFaceUp.includes(target) && !s.revealed.includes(target)));
}
const phaseLabel = (phase: string) => ({ choose: '选择角色', income: '角色行动', build: '建设阶段', ended: '结算' } as Record<string, string>)[phase] ?? phase;
const phaseAction = (phase: string) => ({ choose: '选择角色', income: '领取收入', build: '建设', ability: '使用技能', ended: '结算' } as Record<string, string>)[phase] ?? phase;

function liveRoleCardStatuses(s: GameState): Record<CharacterId, RoleCardStatus> {
  return CHARACTERS.reduce((statuses, c) => {
    statuses[c.id] = s.removedFaceUp.includes(c.id)
      ? 'dark'
      : s.phase === 'choose' && s.rolePool.includes(c.id)
        ? 'front'
        : 'back';
    return statuses;
  }, {} as Record<CharacterId, RoleCardStatus>);
}

function roleCardStatuses(s: GameState) {
  if (mode === 'online' && online.room?.roleStatuses) return online.room.roleStatuses;
  const snapshot = roleDeckSnapshots.get(myPlayer(s)?.id ?? 0);
  if (snapshot?.round === s.round) return snapshot.statuses;
  return liveRoleCardStatuses(s);
}

function freezeRoleCardStatuses(s: GameState) {
  if (roleDeckSnapshots.get(s.picker)?.round !== s.round) roleDeckSnapshots.set(s.picker, { round: s.round, statuses: liveRoleCardStatuses(s) });
}

type ChoiceFlight = { key: string; startedAt: number; sourceX: number; sourceY: number; width: number; height: number };
let choiceFlight: ChoiceFlight | null = null;
const choiceDuration = 1500;
const choiceInterval = 200;

function animateDistrictChoice(events: { player: number; count: number }[]) {
  const pending = state?.pendingDistrictChoice;
  if (!state || !pending || !isMine(state.players[pending.player])) { choiceFlight = null; return events; }
  const key = `${state.round}:${pending.player}`;
  const incoming = events.findIndex(event => event.player === pending.player && event.count === pending.cards.length);
  const deck = document.querySelector<HTMLElement>('[data-deck]');
  if (incoming >= 0 && choiceFlight?.key !== key && deck) {
    const source = deck.getBoundingClientRect();
    choiceFlight = { key, startedAt: performance.now(), sourceX: source.left + source.width / 2, sourceY: source.top + source.height / 2, width: source.width, height: source.height };
  }
  // These are the actual selectable cards. Do not also send a pair of card
  // backs to the avatar for the same draw event.
  const remaining = incoming < 0 ? events : events.filter((_, index) => index !== incoming);
  if (choiceFlight?.key !== key) return remaining;
  const flight = choiceFlight;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-district-choice]'));
  const elapsed = performance.now() - flight.startedAt;
  if (reduced || elapsed >= choiceDuration + (cards.length - 1) * choiceInterval) return remaining;
  document.querySelector('.district-choice-modal')?.classList.add('cards-arriving');
  cards.forEach((card, index) => {
    const destination = card.getBoundingClientRect();
    const dx = flight.sourceX - (destination.left + destination.width / 2);
    const dy = flight.sourceY - (destination.top + destination.height / 2);
    const sx = flight.width / card.offsetWidth;
    const sy = flight.height / card.offsetHeight;
    const lift = Math.min(60, Math.hypot(dx, dy) * .1);
    const frames = [0, .25, .5, .75, 1].map(progress => ({
      offset: progress,
      transform: `translate(${dx * (1 - progress)}px, ${dy * (1 - progress) - Math.sin(Math.PI * progress) * lift}px) scale(${sx + (1 - sx) * progress}, ${sy + (1 - sy) * progress}) rotate(${(-5 + index * 4) * (1 - progress) + (index - .5) * 2 * progress}deg)`,
      opacity: 1,
    }));
    card.disabled = true;
    card.classList.add('is-arriving');
    const animation = card.animate(frames, { duration: choiceDuration, delay: index * choiceInterval, easing: 'cubic-bezier(.33,0,.2,1)', fill: 'both' });
    // A room update can rebuild the DOM mid-flight. Resume from the shared
    // timeline so new renders do not restart the flight or reveal cards early.
    animation.currentTime = elapsed;
    const finish = () => {
      if (!card.isConnected) return;
      animation.cancel(); card.disabled = false; card.classList.remove('is-arriving');
      if (!document.querySelector('.district-choice-card.is-arriving')) document.querySelector('.district-choice-modal')?.classList.remove('cards-arriving');
    };
    animation.onfinish = finish;
  });
  return remaining;
}

function animateDrawEvents(events: { player: number; count: number }[]) {
  if (!events.length) return;
  const deck = document.querySelector<HTMLElement>('[data-deck]');
  if (!deck) return;
  const source = deck.getBoundingClientRect();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const duration = 1200;
  const interval = 180;
  const count = events.reduce((total, event) => total + Math.max(1, event.count), 0);
  let flightIndex = 0;
  deck.classList.add('is-drawing');
  window.setTimeout(() => deck.classList.remove('is-drawing'), reduced ? 240 : duration + (count - 1) * interval);
  events.forEach(event => {
    const target = document.querySelector<HTMLElement>(`[data-player-id="${event.player}"] .hero-avatar, [data-player-id="${event.player}"] .orbit-avatar, .hero-avatar[data-player-id="${event.player}"]`);
    if (!target) return;
    const destination = target.getBoundingClientRect();
    for (let i = 0; i < Math.max(1, event.count); i++) {
      const order = flightIndex++;
      const card = document.createElement('div');
      card.className = 'draw-flight-card';
      card.setAttribute('aria-hidden', 'true');
      card.innerHTML = '<span>🃏</span>';
      card.style.left = `${source.left + source.width / 2 - 28}px`;
      card.style.top = `${source.top + source.height / 2 - 38}px`;
      document.body.appendChild(card);
      const dx = destination.left + destination.width / 2 - (source.left + source.width / 2);
      const dy = destination.top + destination.height / 2 - (source.top + source.height / 2);
      const finish = () => card.remove();
      if (reduced || !card.animate) {
        window.setTimeout(finish, 120 + order * 60);
      } else {
        const lift = Math.min(70, Math.max(24, Math.hypot(dx, dy) * .12));
        const tilt = dx < 0 ? -1 : 1;
        const frames = [
          { progress: 0, scale: .94, rotation: -4, opacity: 0 },
          { progress: .08, scale: .97, rotation: -4, opacity: 1 },
          { progress: .25, scale: 1, rotation: -3, opacity: 1 },
          { progress: .5, scale: .88, rotation: 2, opacity: 1 },
          { progress: .75, scale: .6, rotation: 1, opacity: 1 },
          { progress: .85, scale: .48, rotation: .5, opacity: .92 },
          { progress: 1, scale: .3, rotation: 0, opacity: 0 },
        ].map(frame => ({
          offset: frame.progress,
          transform: `translate(${dx * frame.progress}px, ${dy * frame.progress - Math.sin(Math.PI * frame.progress) * lift}px) scale(${frame.scale}) rotate(${frame.rotation * tilt}deg)`,
          opacity: frame.opacity,
        }));
        const animation = card.animate(
          frames,
          { duration, delay: order * interval, easing: 'cubic-bezier(.42,0,.22,1)', fill: 'both' },
        );
        animation.onfinish = finish;
        animation.oncancel = finish;
      }
    }
  });
}

function render() {
  window.clearTimeout(aiTimer);
  if (mode === 'local' && state) {
    for (let i = 0; i < state.players.length && state.phase === 'income'; i++) if (beginTurn(state)) break;
    const acting = state.players[state.phase === 'choose' ? state.picker : state.currentPlayer];
    if (acting?.human) localViewer = acting.id;
  }
  const drawEvents = mode === 'online' ? (state?.drawEvents ?? []).filter(event => event.id > lastDrawEvent) : state?.drawEvents?.splice(0) ?? [];
  if (drawEvents.length) lastDrawEvent = Math.max(...drawEvents.map(event => event.id));
  if (state && state.phase === 'choose' && isMine(state.players[state.picker])) {
    const promptKey = `${state.round}:${state.picker}:${state.picksMade}`;
    if (promptKey !== roleAutoPromptKey && !roleModalOpen) {
      roleAutoPromptKey = promptKey;
      roleModalOpen = true;
      inspectedRole = null;
    }
  }
  app.innerHTML = state ? gameView(state) : mode === 'online' && online.room ? lobbyView(online.room) : setupView();
  animateDrawEvents(animateDistrictChoice(drawEvents));
  animateRolePicker(roleModalOpen);
  remoteArrows.forEach(drawRemoteArrow);
  if (mode === 'online') return;
  if (roleModalOpen) return;
  if (state && state.phase === 'choose' && !state.players[state.picker]?.human) {
    aiTimer = window.setTimeout(() => {
      if (!state || state.phase !== 'choose') return;
      const available = CHARACTERS.filter(c => state!.rolePool.includes(c.id) && !state!.chosen.includes(c.id));
      const pick = available[Math.floor(Math.random() * available.length)];
      if (pick) chooseCharacter(state, state.picker, pick.id);
      render();
    }, 500);
  } else if (state && state.phase !== 'ended' && state.phase !== 'choose' && !current().human) {
    aiTimer = window.setTimeout(() => { if (state) { aiAct(state); render(); } }, 650);
  }
}

function homeCityArtwork() {
  const districts = [{ name: '大教堂', color: 'blue' }, { name: '城堡', color: 'yellow' }, { name: '港口', color: 'green' }];
  return `<div class="home-city-art" aria-hidden="true"><div class="home-city-orbit"></div><div class="home-city-foundation"></div>${districts.map((district, index) => `<div class="home-city-card home-city-card-${index} ${district.color}"><span class="home-card-ornament">✦</span>${districtIcon(district)}<strong>${district.name}</strong><span class="home-card-rule"></span></div>`).join('')}<div class="home-role-seal">${roleIcon('国王')}</div></div>`;
}

function setupView() {
  return `<main class="shell home-shell">${fullscreenButton('page-fullscreen')}<div class="home-layout">
    <section class="home-intro" aria-labelledby="home-title"><div class="home-edition"><span class="home-crest">✦</span><span>CITADELS<span class="home-edition-rule"></span>THE ROYAL TABLE</span></div><div class="home-title-copy"><p class="eyebrow">城市 · 身份 · 权谋</p><h1 id="home-title">富饶之城</h1><p class="home-tagline">王冠之下，各筑其城。</p></div>${homeCityArtwork()}<div class="home-facts"><span><b>2–8</b> 位城主</span><i></i><span><b>8</b> 种身份</span><i></i><span>同机 / 联机</span></div></section>
    <section class="home-play-panel" aria-label="对局设置"><div class="mode-switch" role="group" aria-label="游戏模式"><button data-action="mode-local" aria-pressed="${mode === 'local'}" class="${mode === 'local' ? 'active' : ''}"><span aria-hidden="true">♜</span>同机游玩</button><button data-action="mode-online" aria-pressed="${mode === 'online'}" class="${mode === 'online' ? 'active' : ''}"><span aria-hidden="true">♟</span>在线联机</button></div>
    ${mode === 'online' ? onlineSetupView() : `
    <section class="setup-card home-local-setup"><div class="setup-heading"><div><span class="eyebrow">LOCAL TABLE</span><h2>开启一桌好戏</h2></div><span class="player-count">2–8 人</span></div>
      <div class="home-player-settings"><label>桌上城主 <strong>${setupPlayers}<small> 人</small></strong><input aria-label="桌上城主" type="range" min="2" max="8" value="${setupPlayers}" data-bind="players" /></label><label>真人玩家 <strong>${setupHumans}<small> 人</small></strong><input aria-label="真人玩家" type="range" min="1" max="${setupPlayers}" value="${setupHumans}" data-bind="humans" /></label></div>
      <div class="home-seats" aria-label="${setupHumans} 位真人，${setupPlayers - setupHumans} 位 AI">${Array.from({ length: setupPlayers }, (_, index) => `<span class="home-seat ${index < setupHumans ? 'human' : 'ai'}" aria-hidden="true">${index < setupHumans ? '♟' : '◆'}</span>`).join('')}<span class="home-seat-summary">${setupPlayers - setupHumans ? `${setupPlayers - setupHumans} 位 AI 补位` : '全员真人'}</span></div>
      <p class="home-local-note">同一设备轮流游玩，AI 自动补齐空位。</p><button class="primary full home-start" data-action="start">开始建城 <span aria-hidden="true">✦</span></button>
    </section>`}<p class="home-panel-footer">选取身份，经营城区，争夺王冠。</p></section></div></main>`;
}

function connectionChip() {
  const label = { offline: '未连接', connecting: '连接中', connected: '已连接', reconnecting: '重连中' }[online.status];
  return `<span class="connection-chip ${online.status}" role="status">${label}${online.pending ? ' · 等待响应' : ''}</span>`;
}
function noticeView() { return onlineNotice ? `<div class="online-notice" role="status">${esc(onlineNotice)}</div>` : ''; }
function onlineSetupView() {
  const busy = online.pending || online.hasSession;
  return `<section class="setup-card online-setup"><div class="setup-heading"><div><span class="eyebrow">FRIENDS TABLE</span><h2>邀请城主入席</h2></div>${connectionChip()}</div>
    ${noticeView()}<div class="online-form"><label>玩家昵称<input data-online="name" maxlength="24" placeholder="输入昵称" value="${esc(onlineName)}" autocomplete="nickname" /></label>
    <div class="home-room-options"><div class="home-room-create"><div class="online-form-row"><label>房间人数<select data-online="capacity">${Array.from({ length: 7 }, (_, i) => i + 2).map(n => `<option value="${n}" ${n === onlineCapacity ? 'selected' : ''}>${n} 人</option>`).join('')}</select></label><label>AI 城主<select data-online="ai">${Array.from({ length: onlineCapacity }, (_, n) => `<option value="${n}" ${n === onlineAiCount ? 'selected' : ''}>${n} 位</option>`).join('')}</select></label></div>
    <div class="online-controls"><button class="primary full" data-action="online-create" ${busy ? 'disabled' : ''}>创建房间</button></div></div><div class="home-room-join"><label>加入已有房间<input aria-label="房间码" data-online="code" maxlength="6" placeholder="输入 6 位房间码" value="${esc(onlineCode)}" autocomplete="off" autocapitalize="characters" /></label>
    <button class="secondary full" data-action="online-join" ${busy ? 'disabled' : ''}>加入房间</button></div></div></div>
    ${online.hasSession ? '<div class="online-controls"><button class="secondary" data-action="online-reconnect">恢复连接</button><button class="secondary" data-action="online-leave">离开原房间</button></div>' : ''}</section>`;
}
function lobbyView(room: Room) {
  const own = room.members.find(member => member.id === online.playerId);
  const ready = own?.ready ?? false;
  const canStart = room.members.length + room.aiCount >= 2 && room.members.every(member => member.ready && member.connected) && canAct();
  const seats = room.members.map(member => `<article class="lobby-seat ${member.ready ? 'ready' : ''} ${!member.connected ? 'offline' : ''} ${member.id === room.hostId ? 'host' : ''}"><span class="lobby-avatar">${member.id === room.hostId ? '♛' : '♟'}</span><div class="lobby-member-copy"><strong>${esc(member.name)}${member.id === online.playerId ? '（你）' : ''}</strong><small>${member.id === room.hostId ? '房主' : '城主'}</small></div><span class="lobby-member-state">${!member.connected ? '离线' : member.ready ? '已准备' : '未准备'}</span></article>`);
  for (let i = 0; i < room.aiCount; i++) seats.push(`<article class="lobby-seat ready"><span class="lobby-avatar">◆</span><div class="lobby-member-copy"><strong>AI 城主 ${i + 1}</strong><small>自动行动</small></div><span class="lobby-member-state">已准备</span></article>`);
  while (seats.length < room.capacity) seats.push('<article class="lobby-seat empty"><span class="lobby-avatar">＋</span><div class="lobby-member-copy"><strong>空位</strong><small>等待玩家加入</small></div></article>');
  return `<main class="shell setup-shell">${fullscreenButton('page-fullscreen')}<section class="brand-lockup"><div class="crest large">✦</div><h1>富饶之城</h1></section><section class="online-lobby"><header><div><span class="eyebrow">房间大厅</span><h2>等待城主入席</h2></div>${connectionChip()}</header><div class="online-controls"><span class="room-code"><small>房间码</small>${esc(room.code)}</span><button class="invite-button" data-action="online-invite">复制邀请链接</button></div>${noticeView()}<div class="lobby-seats">${seats.join('')}</div><div class="lobby-actions"><button class="${ready ? 'secondary' : 'primary'}" data-action="online-ready" ${canAct() ? '' : 'disabled'}>${ready ? '取消准备' : '准备'}</button>${room.hostId === online.playerId ? `<button class="primary" data-action="online-start" ${canStart ? '' : 'disabled'}>开始对局</button>` : ''}<button class="secondary" data-action="online-leave">离开房间</button></div></section></main>`;
}
function onlineTableBar() {
  const room = online.room;
  if (mode !== 'online' || !room) return '';
  const disconnected = room.members.filter(member => !member.connected).map(member => esc(member.name));
  return `<div class="online-table-bar">${connectionChip()}${disconnected.length ? `<span>${disconnected.join('、')} 等待重连</span>` : ''}<button class="invite-button" data-action="online-invite">复制邀请</button>${room.status === 'ended' && room.hostId === online.playerId ? '<button class="online-button" data-action="online-rematch">再来一局</button>' : ''}<button class="online-button" data-action="online-leave">离开房间</button>${noticeView()}</div>`;
}

function playerRingCard(p: Player, s: GameState, active: boolean) {
  const revealed = s.phase === 'ended' || (!!p.character && s.revealed.includes(p.character));
  const role = revealed && p.character ? `${roleIcon(p.character)} ${p.character}` : p.character || (p as Player & { roleSelected?: boolean }).roleSelected ? '已选角色' : '等待选角';
  const city = p.city.length ? p.city.map((c, index) => {
    const detail = JSON.stringify({ name: c.name, color: c.color, icon: c.icon, cost: c.cost, points: c.points, type: districtType(c.color), owner: p.name, text: districtDescription(c) });
    return `<button class="orbit-city-building ${c.color}" data-district-player="${p.id}" data-district-index="${index}" data-district-detail="${esc(detail)}" aria-label="${esc(c.name)}：费用 ${c.cost} 金币，${c.points} 分"><span>${districtIcon(c)}</span><small>${esc(c.name)}</small></button>`;
  }).join('') : '<span class="orbit-city-empty">暂无建筑</span>';
  const avatar = p.character && revealed ? roleIcon(p.character) : (p.human ? '♟' : '◆');
  return `<article class="orbit-player ${active ? 'active' : ''} ${p.human ? 'human' : ''}" data-player-id="${p.id}" ${pendingAbility?.mode === 'player' ? `data-ability-target-player="${p.id}"` : ''}><div class="orbit-avatar ${p.character && revealed ? 'has-role' : ''}">${avatar}</div><div class="orbit-copy"><strong>${esc(p.name)}</strong><small>${role}</small></div><span class="orbit-score">${totalScore(p, s.finisherId, s.endThreshold)} 分</span><div class="orbit-stats"><span>🪙 ${p.coins}</span><span>🏛 ${p.city.length}</span><span>🃏 ${handCount(p)}</span></div><div class="orbit-city">${city}</div></article>`;
}

function districtCard(c: District, selectable: boolean, index: number, extra = '') {
  return `<button class="district-card ${c.color} ${selectable ? 'selectable' : ''} ${extra}" style="--i:${index}" ${selectable ? `data-build="${index}"` : 'disabled'}><span class="district-icon">${districtIcon(c)}</span><span class="district-name">${c.name}</span><span class="district-cost">${c.cost} 🪙</span><span class="district-points">${c.points} 分</span></button>`;
}

function cityLane(p: Player, s: GameState) {
  const cards = p.city.map((c, index) => `<button class="city-building central-building ${c.color}" data-district-player="${p.id}" data-district-index="${index}" aria-label="${esc(c.name)}：费用 ${c.cost} 金币，${c.points} 分"><span class="central-building-icon">${districtIcon(c)}</span><strong class="central-building-name">${esc(c.name)}</strong><small class="central-building-cost">费用 ${c.cost} 🪙</small><small class="central-building-points">${c.points} 分</small></button>`).join('');
  const content = cards || '<span class="empty-city">空城</span>';
  return `<section class="city-lane ${p.human ? 'my-city' : ''}"><div class="city-buildings">${content}</div></section>`;
}

function incomeCard(s: GameState, owner: Player, type: 'coins' | 'cards') {
  const selected = owner.incomeChoice;
  const used = selected === type;
  const discarded = !!selected && selected !== type;
  const available = s.phase === 'income' && s.currentPlayer === owner.id && isMine(owner) && !selected && canAct();
  const icon = incomeIcon(type);
  const name = type === 'coins' ? '金币牌' : '地区卡牌';
  const detail = type === 'coins' ? '抽取 +2 金币' : '抽取地区卡';
  return `<button class="income-card hand-income-card ${type} ${used ? 'used' : ''} ${discarded ? 'discarded' : ''}" data-action="income-${type}" ${available ? '' : 'disabled'}><span class="income-card-mark">${icon}</span><b>${name}</b><small>${detail}</small><em>${used ? '已使用' : discarded ? '已弃置' : '收入'}</em></button>`;
}

function handTray(handOwner: Player, s: GameState, canBuild: boolean) {
  const cards = handOwner.hand.map((c, i) => districtCard(c, canBuild, i, 'hand-card')).join('');
  const income = s.phase !== 'ended' ? `${incomeCard(s, handOwner, 'coins')}${incomeCard(s, handOwner, 'cards')}` : '';
  return `<section class="hand-tray" aria-label="手牌"><div class="hand-cards">${income}${cards}</div></section>`;
}

function districtChoiceModal(s: GameState) {
  const pending = s.pendingDistrictChoice;
  if (!pending || !isMine(s.players[pending.player])) return '';
  const owner = s.players[pending.player];
  const cards = pending.cards.map((c, index) => `<button class="district-choice-card district-card ${c.color} selectable" style="--i:${index}" data-district-choice="${index}" aria-label="选择${esc(c.name)}"><span class="district-icon">${districtIcon(c)}</span><span class="district-name">${esc(c.name)}</span><span class="district-cost">${c.cost} 🪙</span><span class="district-points">${c.points} 分</span></button>`).join('');
  return `<div class="modal-backdrop district-choice-backdrop" role="dialog" aria-modal="true" aria-label="选择地区卡"><section class="district-choice-modal"><span class="eyebrow">${esc(owner?.name ?? '玩家')}</span><h2>选择一张地区卡</h2><div class="district-choice-cards">${cards}</div>${mode === 'online' ? `<div class="online-controls district-choice-controls"><button class="secondary" data-action="online-leave" ${online.pending ? 'disabled' : ''}>离开房间</button></div>` : ''}</section></div>`;
}

type RoleAbility = { name: string; text: string; passive?: boolean };
type RoleAbilityPair = [RoleAbility, RoleAbility | null];

// Show the actual rules for each role, without inventing a second ability.
const roleAbilities: Record<CharacterId, RoleAbilityPair> = {
  '刺客': [{ name: '宣告暗杀', text: '指定另一名角色，使其跳过本轮行动。' }, null],
  '盗贼': [{ name: '准备偷窃', text: '指定未公开的角色，在其回合开始时夺取全部金币。不能选择刺客、被暗杀或面向上移出的角色。' }, null],
  '魔法师': [{ name: '交换手牌', text: '与一名玩家交换全部手牌；两种魔法本回合只能选用一种。' }, { name: '弃牌重抽', text: '选择任意数量手牌放到牌库底，再抽回相同数量；两种魔法只能选用一种。' }],
  '国王': [{ name: '取得皇冠', text: '角色被叫到时自动取得皇冠，下轮首先选角；被暗杀仍可取得皇冠。', passive: true }, { name: '贵族税收', text: '按黄色地区数量一次领取金币，可在建造前或后使用。' }],
  '主教': [{ name: '教会税收', text: '主动获得蓝色地区金币。' }, { name: '神圣豁免', text: '被动技能：领主不能摧毁你的建筑。', passive: true }],
  '商人': [{ name: '商业税收', text: '按绿色地区数量一次领取金币，可在建造前或后使用。' }, { name: '额外收入', text: '完成拿金币或抽地区卡行动后，自动额外获得 1 金币。', passive: true }],
  '建筑师': [{ name: '建筑蓝图', text: '额外抽取 2 张地区卡。', passive: true }, { name: '连续施工', text: '本回合最多建造 3 座建筑。', passive: true }],
  '领主': [{ name: '征收军税', text: '按红色地区数量一次领取金币，可在建造前或后使用。' }, { name: '拆除建筑', text: '在回合结束时支付建筑费用减 1，摧毁一座建筑并结束回合；主教城区、完整城区和堡垒不能摧毁。' }],
};

function skillCard(side: 'left' | 'right', p: Player, s: GameState, index: 0 | 1) {
  const role = roleData(p.character);
  const ability = role ? roleAbilities[role.id][index] : { name: '技能', text: '' };
  if (!ability) return '';
  const isCurrent = ['income', 'build'].includes(s.phase) && !(p.character === '领主' && index === 1 && s.phase !== 'build') && s.currentPlayer === p.id && isMine(p) && canAct() && !s.pendingDistrictChoice;
  const passive = !!role && !!ability.passive;
  const used = role ? abilityIsUsed(p, index) : true;
  const disabled = !role || passive || !isCurrent || used;
  const detail = ability.text || (role ? `${ability.name}技能` : '等待选择角色');
  const label = `${role?.id ?? '角色'}：${ability.name}${passive ? '（被动技能）' : ''}。${detail}`;
  const mode = role ? abilityMode(p, index) : null;
  const icon = abilityIcon(role?.id, index);
  return `<button class="skill-card ${side} ${used ? 'used' : ''} ${passive ? 'passive' : ''}" data-ability="${index}" ${mode ? `data-ability-target-mode="${mode}"` : ''} data-skill-detail="${esc(detail)}" aria-label="${esc(label)}" ${disabled ? 'disabled' : ''}><span class="skill-card-icon">${icon}</span></button>`;
}

function heroConsole(s: GameState, me: Player) {
  const activeRole = roleData(me.character);
  const roleStates = roleCardStatuses(s);
  const roleThumbnail = `<span class="role-thumb-grid" aria-hidden="true">${CHARACTERS.map(c => {
    const status = roleStates[c.id];
    const chosen = s.chosen.includes(c.id);
    const statusLabel = chosen ? '已选择（保留当前牌面）' : status === 'dark' ? '面向上移出' : status === 'back' ? '卡背' : '可选正面';
    return `<span class="role-thumb-mini ${status} ${chosen ? 'is-chosen' : ''} ${activeRole?.id === c.id ? 'is-active' : ''}" data-role-thumb="${c.id}" title="${esc(c.id)} · ${statusLabel}"><span class="role-thumb-mini-icon">${status === 'back' ? '✦' : roleIcon(c.id)}</span><span class="role-thumb-mini-rank">${c.rank}</span></span>`;
  }).join('')}</span>`;
  const roleButton = s.phase !== 'ended' ? `<button class="hero-control-button role-open-button ${activeRole ? 'has-role-thumb' : 'generic-role-thumb'}" data-action="open-role-picker" aria-label="打开八张角色牌${activeRole ? `，当前角色：${activeRole.id}` : ''}">${roleThumbnail}<span class="role-open-arrow">›</span></button>` : '';
  const canEnd = s.phase === 'build' && s.currentPlayer === me.id && isMine(me) && !s.pendingDistrictChoice && canAct();
  const endButton = `<button class="hero-control-button end-turn ${canEnd ? '' : 'disabled'}" data-action="end" ${canEnd ? '' : 'disabled'}><b>结束回合</b></button>`;
  const deckCount = (s as GameState & { deckCount?: number }).deckCount ?? s.deck.length;
  const deck = `<div class="district-deck" data-deck aria-label="地区牌库，剩余 ${deckCount} 张"><span class="district-deck-back">✦</span><span class="district-deck-count">${deckCount}<small>张</small></span></div>`;
  const avatar = activeRole ? roleIcon(activeRole.id) : (me.human ? '♟' : '◆');
  const roleAvatarClass = activeRole ? 'has-role' : '';
  const score = totalScore(me, s.finisherId, s.endThreshold);
  // Keep the two controls at the outer edges of the hero console. The
  // surrounding layout can place .hero-role-control in the first column and
  // .hero-end-control in the last column on both desktop and mobile widths.
  const leftControl = roleButton ? `<div class="hero-control-slot hero-role-control">${roleButton}</div>` : '<span class="hero-control-slot hero-role-control" aria-hidden="true"></span>';
  const rightControl = endButton ? `<div class="hero-control-slot hero-end-control">${endButton}${deck}</div>` : '<span class="hero-control-slot hero-end-control" aria-hidden="true"></span>';
  return `<section class="hero-console">${leftControl}<div class="hero-skill-slot left">${skillCard('left', me, s, 0)}</div><div class="hero-pedestal"><div class="hero-halo"></div><div class="hero-avatar ${roleAvatarClass}" data-player-id="${me.id}">${avatar}</div><span class="hero-crown">${s.crownHolder === me.id ? '♛' : ''}</span><div class="hero-name"><strong>${esc(me.name)}</strong><small>${activeRole ? `${roleIcon(me.character)} ${activeRole.id}` : '尚未选择角色'}</small></div><div class="hero-player-stats"><div class="coin-pouch"><span class="coin-orbit">🪙</span><div><small>金币</small><strong>${me.coins}</strong></div></div><div class="hero-score"><small>分数</small><strong>${score} 分</strong></div></div></div><div class="hero-skill-slot right">${skillCard('right', me, s, 1)}</div>${rightControl}</section>`;
}

function activateAbility(s: GameState, p: Player, index: number) {
  const abilityIndex = index as 0 | 1;
  if (!p.character || !['income', 'build'].includes(s.phase) || s.currentPlayer !== p.id || abilityIsUsed(p, abilityIndex) || s.pendingDistrictChoice) return false;
  const ability = roleAbilities[p.character][abilityIndex];
  if (!ability || ability.passive) return false;
  const mode = abilityMode(p, abilityIndex);
  if (mode) { redrawCards.clear(); pendingAbility = { index: abilityIndex, mode }; return true; }
  return performGameAction({ kind: 'ability', index: abilityIndex });
}

function abilityTargetModal(s: GameState) {
  if (!pendingAbility) return '';
  const actor = myPlayer(s);
  if (!actor?.character) return '';
  const role = actor.character;
  let cards = '';
  let heading = '选择目标';
  if (pendingAbility.mode === 'role') {
    heading = role === '刺客' ? '选择要暗杀的角色' : '选择要偷盗的角色';
    const targets = CHARACTERS.filter(c => roleTargetAllowed(s, role, c.id));
    cards = targets.map(c => `<button class="ability-target-card" data-ability-target-role="${esc(c.id)}"><span class="ability-target-icon">${roleIcon(c.id)}</span><span><strong>${c.id}</strong><small>${role === '刺客' ? '跳过本轮行动' : '夺取其金币'}</small></span></button>`).join('');
  } else if (pendingAbility.mode === 'player') {
    heading = '选择交换手牌的玩家';
    cards = s.players.filter(p => p.id !== actor.id).map(p => `<button class="ability-target-card" data-ability-target-player="${p.id}"><span class="ability-target-icon">${p.human ? '♟' : '◆'}</span><span><strong>${esc(p.name)}</strong><small>${handCount(p)} 张手牌 · ${p.coins} 金币</small></span></button>`).join('');
  } else if (pendingAbility.mode === 'hand') {
    heading = '选择要重抽的手牌';
    cards = actor.hand.map((district, index) => `<button class="district-card redraw-choice ${district.color} ${redrawCards.has(index) ? 'selected' : ''}" data-redraw-card="${index}" aria-pressed="${redrawCards.has(index)}"><span class="district-icon">${districtIcon(district)}</span><span class="district-name">${esc(district.name)}</span><span class="district-cost">${district.cost} 🪙</span><span class="redraw-mark">${redrawCards.has(index) ? '✓' : '＋'}</span></button>`).join('');
  } else {
    heading = '选择要摧毁的建筑';
    cards = s.players.flatMap(victim => victim.city.map((district, districtIndex) => ({ victim, district, districtIndex }))).filter(x => destroyAllowed(s, actor.id, x.victim.id, x.districtIndex)).map(x => `<button class="ability-target-card district-card ${x.district.color} ability-building-target" data-ability-target-player="${x.victim.id}" data-ability-target-district="${x.districtIndex}"><span class="district-icon">${districtIcon(x.district)}</span><span><strong>${esc(x.district.name)}</strong><small>费用 ${destructionCost(s, x.victim.id, x.districtIndex)} 🪙 · ${esc(x.victim.name)}</small></span></button>`).join('');
  }
  if (!cards) cards = '<div class="ability-target-empty">当前没有符合条件的目标</div>';
  return `<div class="ability-target-backdrop" data-ability-target-backdrop role="dialog" aria-modal="true" aria-label="${heading}"><section class="ability-target-modal"><header><div><span class="eyebrow">${roleIcon(role)} ${role}</span><h2>${heading}</h2></div><button class="ability-target-close" data-action="close-ability-target" aria-label="关闭">×</button></header><div class="ability-target-grid ${pendingAbility.mode === 'hand' ? 'redraw-grid' : ''}">${cards}</div>${pendingAbility.mode === 'hand' ? `<footer class="redraw-actions"><button class="primary" data-action="confirm-redraw" ${redrawCards.size && canAct() ? '' : 'disabled'}>重抽 ${redrawCards.size} 张</button></footer>` : ''}</section></div>`;
}

function destroyAllowed(s: GameState, actor: number, player: number, district: number) {
  if (mode === 'local') return canDestroyDistrict(s, actor, player, district);
  return (s as NonNullable<Room['state']>).allowedDestroyTargets?.some(target => target.player === player && target.district === district) ?? false;
}

function roleModal(s: GameState) {
  if (!roleModalOpen) return '';
  const choosing = s.phase === 'choose' && isMine(s.players[s.picker]) && canAct();
  const roleStates = roleCardStatuses(s);
  const details: Record<CharacterId, string> = { '刺客': '指定另一名角色，使其跳过本轮行动。', '盗贼': '指定角色，轮到其行动时夺取全部金币。不能选择刺客、被暗杀、已公开或面向上移出的角色。', '魔法师': '二选一：与其他玩家交换全部手牌；或选择任意数量手牌放到牌库底并抽回等量牌。', '国王': '自动取得皇冠，下轮首先选角；被暗杀仍可取得。可主动领取黄色地区收入。', '主教': '可主动领取蓝色地区收入；领主不能摧毁你的城区。', '商人': '完成基础行动后自动额外获得 1 金币；可主动领取绿色地区收入。', '建筑师': '完成基础行动后自动额外抽 2 张地区卡，本回合最多建造 3 座建筑。', '领主': '可主动领取红色地区收入，并在回合结束时支付建筑费用减 1 摧毁一座建筑。' };
  const cards = CHARACTERS.map(c => {
    const status = roleStates[c.id];
    // A snapshot can preserve the front face of the role selected by the
    // human, but the physical card is no longer selectable once it leaves the
    // live role pool. Keep that distinction in the click guard as well.
    const selectable = !roleModalClosing && status === 'front' && choosing && s.rolePool.includes(c.id);
    const statusText = s.chosen.includes(c.id) ? '已选择 · 保留当前牌面' : status === 'dark' ? '面向上移出' : status === 'front' ? '可选择' : '不可选择';
    const hint = status === 'back' ? '面向下移出，或已被其他玩家选走。' : status === 'dark' ? '面向上移出本轮。' : s.chosen.includes(c.id) ? '已选择，保留选角时的牌面。' : choosing ? '本轮可选择。' : '保留选角时的牌面。';
    return `<button class="role-card ${status} ${selectable ? 'selectable' : ''}" data-role-card="${c.id}" data-role-hint="${esc(hint)}" ${selectable ? '' : 'disabled'} aria-label="${c.id}，${statusText}"><span class="role-card-rank">${c.rank}</span>${status === 'back' ? '<span class="role-card-back-mark">✦</span><b class="role-card-back-label">角色卡</b>' : `<span class="role-card-icon">${roleIcon(c.id)}</span><strong>${c.id}</strong><small>${details[c.id]}</small>`}</button>`;
  }).join('');
  return `<div class="modal-backdrop role-modal-backdrop" data-role-modal-backdrop role="dialog" aria-modal="true" aria-label="角色牌"><section class="role-picker-modal"><div class="role-card-grid">${cards}</div></section></div>`;
}

async function closeRoles(afterClose?: () => void) {
  if (!roleModalOpen || roleModalClosing) return;
  roleModalClosing = true;
  const token = ++roleCloseToken;
  await closeRolePickerAnimation();
  if (token !== roleCloseToken) return;
  roleModalClosing = false; roleModalOpen = false; inspectedRole = null;
  afterClose?.();
  render();
}

function districtModal(s: GameState) {
  if (!selectedDistrict) return ''; const p = s.players[selectedDistrict.player]; const c = p?.city[selectedDistrict.index]; if (!p || !c) return '';
  return `<div class="modal-backdrop" role="dialog" aria-label="建筑详情"><div class="detail-modal ${c.color}"><button class="modal-close" data-action="close-district" aria-label="关闭">×</button><span class="modal-icon">${districtIcon(c)}</span><span class="eyebrow">${districtType(c.color)}</span><h2>${esc(c.name)}</h2><div class="modal-stats"><span>建造费用 <b>${c.cost} 🪙</b></span><span>基础分值 <b>${c.points} 分</b></span></div><p>${esc(districtDescription(c))}</p></div></div>`;
}

function scores(s: GameState) {
  const score = (p: Player) => totalScore(p, s.finisherId, s.endThreshold);
  return `<section class="score-panel"><div class="score-heading"><span class="eyebrow">王国结算</span><h2>城市荣光</h2></div>${[...s.players].sort((a, b) => score(b) - score(a)).map((p, i) => `<div class="score-row"><span class="rank">${i + 1}</span><div class="avatar">${p.human ? '♟' : '◆'}</div><strong>${esc(p.name)}</strong><span>${p.city.length} 座建筑</span><b>${score(p)} 分</b></div>`).join('')}</section>`;
}

function gameView(s: GameState) {
  const acting = s.phase === 'choose' ? s.players[s.picker] : current(); const me = myPlayer(s) ?? acting; const publicPlayers = s.players.filter(p => p.id !== me.id);
  const action = pendingAbility ? '选择技能目标' : s.pendingDistrictChoice || (s as NonNullable<Room['state']>).pendingDistrictPlayer !== undefined ? '选择地区卡' : phaseAction(s.phase);
  const actionHint = acting ? `${acting.name}：${action}` : action;
  const roomBadge = `<div class="game-topbar-tools"><span class="game-room-number"><small>房间</small><b>${mode === 'online' && online.room ? esc(online.room.code) : '本机'}</b></span>${fullscreenButton()}</div>`;
  return `<main class="shell game-shell"><header class="game-topbar"><div class="brand-mini"><span class="crest">✦</span><span>富饶之城</span></div><div class="round-marker"><span>第 ${s.round} 轮</span><b>${phaseLabel(s.phase)}</b><small class="round-action-hint" aria-live="polite">${esc(actionHint)}</small></div>${roomBadge}</header>${onlineTableBar()}<section class="table-world"><div class="table-glow"></div><section class="opponent-orbit"><div class="orbit-label"><span class="eyebrow">王国牌桌</span><small>${s.players.length} 位城主</small></div>${publicPlayers.map(p => playerRingCard(p, s, s.phase === 'choose' ? s.picker === p.id : s.currentPlayer === p.id)).join('')}</section><section class="city-stage"><div class="city-lanes">${cityLane(me, s)}</div></section>${s.phase === 'ended' ? scores(s) : `${heroConsole(s, me)}${handTray(me, s, s.phase === 'build' && acting.id === me.id && isMine(me) && canAct() && !s.pendingDistrictChoice)}`}</section></main>${districtModal(s)}${roleModal(s)}${districtChoiceModal(s)}${abilityTargetModal(s)}`;
}

app.addEventListener('input', e => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.bind === 'players') { setupPlayers = Number(el.value); setupHumans = Math.min(setupHumans, setupPlayers); render(); }
  if (el.dataset.bind === 'humans') { setupHumans = Number(el.value); render(); }
  if (el.dataset.online === 'name') { onlineName = el.value; localStorage.setItem('citadels-player-name', onlineName); }
  if (el.dataset.online === 'code') { onlineCode = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); el.value = onlineCode; }
});
app.addEventListener('change', e => {
  const el = e.target as HTMLSelectElement;
  if (el.dataset.online === 'capacity') { onlineCapacity = Number(el.value); onlineAiCount = Math.min(onlineAiCount, onlineCapacity - 1); render(); }
  if (el.dataset.online === 'ai') onlineAiCount = Number(el.value);
});
async function copyInvitation() {
  if (!online.room) return;
  const link = new URL('/', shareOrigin); link.searchParams.set('room', online.room.code);
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link.href);
    else {
      const input = document.createElement('textarea'); input.value = link.href;
      input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select();
      const copied = document.execCommand('copy'); input.remove(); if (!copied) throw new Error('copy');
    }
    onlineNotice = '邀请链接已复制';
  } catch { onlineNotice = `邀请链接：${link.href}`; }
  render();
}
app.addEventListener('click', e => {
  const target = e.target as HTMLElement;
  if (target.closest('input, select, textarea, [contenteditable="true"]')) return;
  if (target.closest('button:disabled')) return;
  const district = target.closest<HTMLElement>('[data-district-player]');
  const roleCard = target.closest<HTMLElement>('[data-role-card]')?.dataset.roleCard as CharacterId | undefined;
  const buildIndex = target.closest<HTMLElement>('[data-build]')?.dataset.build;
  const districtChoiceIndex = target.closest<HTMLElement>('[data-district-choice]')?.dataset.districtChoice;
  const abilityIndex = target.closest<HTMLElement>('[data-ability]')?.dataset.ability;
  const targetRole = target.closest<HTMLElement>('[data-ability-target-role]')?.dataset.abilityTargetRole as CharacterId | undefined;
  const targetPlayerEl = target.closest<HTMLElement>('[data-ability-target-player]');
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  const roleBackdrop = target.closest<HTMLElement>('[data-role-modal-backdrop]');
  const abilityBackdrop = target.closest<HTMLElement>('[data-ability-target-backdrop]');
  if (action?.startsWith('mode-')) {
    mode = action === 'mode-online' ? 'online' : 'local'; state = null; resetOverlays(); onlineNotice = '';
    if (mode === 'online' && online.hasSession) online.connect();
  } else if (action?.startsWith('online-')) {
    onlineNotice = '';
    if (action === 'online-create' || action === 'online-join') {
      if (!onlineName.trim()) onlineNotice = '请输入玩家昵称';
      else if (action === 'online-create') online.request({ type: 'create', name: onlineName.trim(), capacity: onlineCapacity, aiCount: onlineAiCount });
      else if (onlineCode.length !== 6) onlineNotice = '请输入 6 位房间码';
      else online.request({ type: 'join', name: onlineName.trim(), code: onlineCode });
    } else if (action === 'online-ready') online.request({ type: 'ready', ready: !online.room?.members.find(member => member.id === online.playerId)?.ready });
    else if (action === 'online-start') online.request({ type: 'start' });
    else if (action === 'online-rematch') { resetOverlays(); lastDrawEvent = 0; online.request({ type: 'rematch' }); }
    else if (action === 'online-reconnect') online.connect();
    else if (action === 'online-invite') { void copyInvitation(); return; }
    else if (action === 'online-leave') { if (online.status !== 'connected') onlineNotice = '连接恢复后将自动离开房间'; online.leave(); resetOverlays(); }
  } else if (abilityBackdrop && target === abilityBackdrop) { pendingAbility = null; redrawCards.clear(); }
  else if (action === 'close-ability-target') { pendingAbility = null; redrawCards.clear(); }
  else if (target.closest<HTMLElement>('[data-redraw-card]') && pendingAbility?.mode === 'hand') {
    const index = Number(target.closest<HTMLElement>('[data-redraw-card]')!.dataset.redrawCard);
    if (redrawCards.has(index)) redrawCards.delete(index); else redrawCards.add(index);
  } else if (action === 'confirm-redraw' && pendingAbility?.mode === 'hand' && redrawCards.size) {
    if (performGameAction({ kind: 'ability', index: pendingAbility.index, target: { cards: [...redrawCards].sort((a, b) => a - b) } })) { pendingAbility = null; redrawCards.clear(); }
  }
  else if (targetRole && pendingAbility && state) {
    if (performGameAction({ kind: 'ability', index: pendingAbility.index, target: targetRole })) pendingAbility = null;
  } else if (targetPlayerEl && pendingAbility && state) {
    const playerId = Number(targetPlayerEl.dataset.abilityTargetPlayer);
    const districtId = targetPlayerEl.dataset.abilityTargetDistrict;
    const value = districtId === undefined ? { player: playerId } : { player: playerId, district: Number(districtId) };
    if (performGameAction({ kind: 'ability', index: pendingAbility.index, target: value })) pendingAbility = null;
  } else if (roleBackdrop && !target.closest('[data-role-card]')) { void closeRoles(); return; }
  else if (districtChoiceIndex !== undefined && state) performGameAction({ kind: 'district', index: Number(districtChoiceIndex) });
  else if (district && state) { roleModalOpen = false; selectedDistrict = { player: Number(district.dataset.districtPlayer), index: Number(district.dataset.districtIndex) }; }
  else if (action === 'open-role-picker' && state) { selectedDistrict = null; inspectedRole = null; roleModalOpen = true; }
  else if (action === 'close-district') selectedDistrict = null;
  else if (action === 'close-role') { void closeRoles(); return; }
  else if (roleCard && state) {
    if (state.phase === 'choose' && isMine(state.players[state.picker]) && state.rolePool.includes(roleCard)) {
      freezeRoleCardStatuses(state);
      void closeRoles(() => performGameAction({ kind: 'choose', character: roleCard }));
      return;
    }
  } else if (abilityIndex !== undefined && state) {
    if (performance.now() < suppressAbilityClickUntil) { e.preventDefault(); return; }
    const human = myPlayer(state);
    if (human) activateAbility(state, human, Number(abilityIndex));
  } else if (buildIndex !== undefined && state) performGameAction({ kind: 'build', index: Number(buildIndex) });
  else if (action === 'start') { state = createGame(setupPlayers, setupHumans); resetOverlays(); }
  else if (action === 'income-coins' && state) performGameAction({ kind: 'coins' });
  else if (action === 'income-cards' && state) performGameAction({ kind: 'cards' });
  else if (action === 'end' && state) performGameAction({ kind: 'end' });
  else if (action === 'reset') { state = null; resetOverlays(); }
  render();
});

function removeAbilityDragArrow() { document.querySelector<HTMLElement>('[data-ability-drag-overlay]')?.remove(); }
function updateAbilityDragArrow(x: number, y: number) {
  if (!dragState?.active) return;
  let svg = document.querySelector<SVGSVGElement>('[data-ability-drag-overlay]');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('ability-drag-overlay');
    svg.setAttribute('data-ability-drag-overlay', 'true');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<defs><marker id="ability-arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e8bf70"></path></marker></defs><line class="ability-drag-arrow" marker-end="url(#ability-arrow-head)"></line>';
    document.body.appendChild(svg);
  }
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  const line = svg.querySelector('line')!;
  line.setAttribute('x1', String(dragState.startX)); line.setAttribute('y1', String(dragState.startY)); line.setAttribute('x2', String(x)); line.setAttribute('y2', String(y));
}
function clearRemoteArrows() {
  remoteArrows.clear(); document.querySelectorAll('[data-remote-arrow]').forEach(element => element.remove());
}
function receiveArrow(arrow: Arrow) {
  if (arrow.playerId === online.playerId) return;
  if (arrow.active) { remoteArrows.set(arrow.playerId, arrow); drawRemoteArrow(arrow); }
  else { remoteArrows.delete(arrow.playerId); document.querySelector(`[data-remote-arrow="${arrow.playerId}"]`)?.remove(); }
}
function drawRemoteArrow(arrow: Arrow) {
  if (!arrow.active || !arrow.to || !state) return;
  const avatar = document.querySelector<HTMLElement>(`[data-player-id="${arrow.playerId}"] .orbit-avatar, .hero-avatar[data-player-id="${arrow.playerId}"]`);
  if (!avatar) return;
  let endpoint: HTMLElement | null = null;
  if (typeof arrow.target === 'string') endpoint = document.querySelector(`[data-role-thumb="${arrow.target}"]`);
  else if (arrow.target && 'player' in arrow.target) {
    endpoint = arrow.target.district === undefined
      ? document.querySelector(`[data-player-id="${arrow.target.player}"] .orbit-avatar, .hero-avatar[data-player-id="${arrow.target.player}"]`)
      : document.querySelector(`[data-district-player="${arrow.target.player}"][data-district-index="${arrow.target.district}"]`);
  }
  const start = avatar.getBoundingClientRect(); const end = endpoint?.getBoundingClientRect();
  let svg = document.querySelector<SVGSVGElement>(`[data-remote-arrow="${arrow.playerId}"]`);
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('ability-drag-overlay');
    svg.setAttribute('data-remote-arrow', String(arrow.playerId)); svg.setAttribute('aria-hidden', 'true');
    const marker = `remote-arrow-${arrow.playerId}`;
    svg.innerHTML = `<defs><marker id="${marker}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e8bf70"></path></marker></defs><line class="ability-drag-arrow" marker-end="url(#${marker})"></line>`;
    document.body.appendChild(svg);
  }
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  const line = svg.querySelector('line')!;
  line.setAttribute('x1', String(start.left + start.width / 2)); line.setAttribute('y1', String(start.top + start.height / 2));
  line.setAttribute('x2', String(end ? end.left + end.width / 2 : arrow.to.x * window.innerWidth));
  line.setAttribute('y2', String(end ? end.top + end.height / 2 : arrow.to.y * window.innerHeight));
}
function dragTarget(element: HTMLElement | null) {
  const role = element?.closest<HTMLElement>('[data-ability-target-role], [data-role-thumb], [data-role-card]');
  if (pendingAbility?.mode === 'role' && role && state) {
    const target = (role.dataset.abilityTargetRole ?? role.dataset.roleThumb ?? role.dataset.roleCard) as CharacterId;
    const actor = myPlayer(state)?.character;
    return actor && roleTargetAllowed(state, actor, target) ? target : undefined;
  }
  const player = element?.closest<HTMLElement>('[data-ability-target-player]');
  if (player) return { player: Number(player.dataset.abilityTargetPlayer), ...(player.dataset.abilityTargetDistrict === undefined ? {} : { district: Number(player.dataset.abilityTargetDistrict) }) };
  const building = element?.closest<HTMLElement>('[data-district-player]');
  if (pendingAbility?.mode === 'building' && building) return { player: Number(building.dataset.districtPlayer), district: Number(building.dataset.districtIndex) };
  const avatar = element?.closest<HTMLElement>('.orbit-player[data-player-id], .hero-avatar[data-player-id]');
  if (avatar) {
    const player = Number(avatar.dataset.playerId);
    if (pendingAbility?.mode === 'player') return { player };
    const character = state?.players.find(p => p.id === player)?.character;
    if (pendingAbility?.mode === 'role' && character && state?.revealed.includes(character)) {
      const actor = myPlayer(state)?.character;
      if (actor && roleTargetAllowed(state, actor, character)) return character;
    }
  }
  return undefined;
}
function stopDrag() {
  if (dragState && mode === 'online') online.arrow(false, dragState.index);
  document.querySelectorAll('.is-skill-target, .is-targeting').forEach(element => element.classList.remove('is-skill-target', 'is-targeting'));
  removeAbilityDragArrow(); dragState = null;
}
app.addEventListener('pointerdown', e => {
  // A fresh press belongs to a new interaction. Only suppress the click
  // generated by the previous drag's release, never the user's next click.
  if (e.isPrimary && e.button === 0) suppressAbilityClickUntil = 0;
  if (!state || !canAct() || dragState || !e.isPrimary || e.button !== 0) return;
  const skill = (e.target as HTMLElement).closest<HTMLElement>('[data-ability]');
  if (!skill || skill.hasAttribute('disabled')) return;
  const human = myPlayer(state);
  const index = Number(skill.dataset.ability) as 0 | 1;
  const targetMode = human && abilityMode(human, index);
  if (!human?.character || !targetMode || targetMode === 'hand' || abilityIsUsed(human, index)) return;
  const rect = skill.getBoundingClientRect();
  dragState = { index, mode: targetMode, startX: rect.left + rect.width / 2, startY: rect.top + rect.height / 2, downX: e.clientX, downY: e.clientY, pointerId: e.pointerId, active: false };
  skill.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', e => {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const distance = Math.hypot(e.clientX - dragState.downX, e.clientY - dragState.downY);
  if (distance > 7) {
    dragState.active = true;
    pendingAbility = { index: dragState.index, mode: dragState.mode };
    document.querySelector(`[data-ability="${dragState.index}"]`)?.classList.add('is-targeting');
    updateAbilityDragArrow(e.clientX, e.clientY);
    document.querySelectorAll('.is-skill-target').forEach(element => element.classList.remove('is-skill-target'));
    const hovered = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (dragTarget(hovered) !== undefined) hovered?.closest('.orbit-player, .hero-avatar, [data-district-player], [data-role-thumb]')?.classList.add('is-skill-target');
    if (mode === 'online' && performance.now() - lastArrowSent > 50) {
      lastArrowSent = performance.now(); const clamp = (n: number) => Math.max(0, Math.min(1, n));
      online.arrow(true, dragState.index, { x: clamp(dragState.startX / innerWidth), y: clamp(dragState.startY / innerHeight) }, { x: clamp(e.clientX / innerWidth), y: clamp(e.clientY / innerHeight) }, dragTarget(document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null));
    }
  }
});
document.addEventListener('pointerup', e => {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const wasDragging = dragState.active;
  const value = dragTarget(document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null);
  const index = dragState.index;
  stopDrag();
  if (!wasDragging) return;
  suppressAbilityClickUntil = performance.now() + 400;
  pendingAbility = null;
  if (state && value !== undefined) performGameAction({ kind: 'ability', index, target: value });
  render();
});
function cancelSkillDrag() { if (dragState?.active) pendingAbility = null; stopDrag(); }
document.addEventListener('pointercancel', cancelSkillDrag);
window.addEventListener('blur', cancelSkillDrag);
window.addEventListener('resize', () => remoteArrows.forEach(drawRemoteArrow));
window.addEventListener('scroll', () => remoteArrows.forEach(drawRemoteArrow), true);

if (online.hasSession) { mode = 'online'; online.connect(); }
void fetch('/online/health').then(response => response.json()).then(health => {
  if (['localhost', '127.0.0.1'].includes(location.hostname) && health.addresses?.length) shareOrigin = `${location.protocol}//${health.addresses[0]}:${location.port}`;
}).catch(() => {});
installHandDrag(app);
installRoleHints(app);
installFullscreen(app);
render();
