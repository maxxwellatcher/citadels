export type Phase = 'setup' | 'choose' | 'income' | 'build' | 'ability' | 'ended';
export type CharacterId = '刺客' | '盗贼' | '魔法师' | '国王' | '主教' | '商人' | '建筑师' | '领主';
export type District = { name: string; color: string; cost: number; points: number; icon: string; ability?: string };
export type AbilityTarget = CharacterId | { player: number; district?: number } | { cards: number[] };
export type DrawEvent = { id: number; player: number; count: number };
export type Player = { id: number; name: string; human: boolean; coins: number; hand: District[]; city: District[]; character?: CharacterId; lastAction?: string; buildsThisTurn: number; abilityUsed: boolean; usedAbilities: number[]; incomeClaimed: boolean; incomeChoice?: 'coins' | 'cards'; turnPrepared?: boolean };

export const CHARACTERS: { id: CharacterId; rank: number; icon: string; text: string }[] = [
  { id: '刺客', rank: 1, icon: '🗡️', text: '选择一名角色，使其跳过本轮。' }, { id: '盗贼', rank: 2, icon: '🦊', text: '选择一名角色，夺取其全部金币。' },
  { id: '魔法师', rank: 3, icon: '✨', text: '交换手牌，或弃牌后重新抽取。' }, { id: '国王', rank: 4, icon: '👑', text: '获得黄色建筑收入并取得皇冠。' },
  { id: '主教', rank: 5, icon: '⛪', text: '获得蓝色建筑收入，领主不能攻击你。' }, { id: '商人', rank: 6, icon: '🪙', text: '获得绿色建筑收入并额外获得 1 金币。' },
  { id: '建筑师', rank: 7, icon: '🏗️', text: '额外抽 2 张牌，最多建造 3 座建筑。' }, { id: '领主', rank: 8, icon: '🛡️', text: '获得红色建筑收入，可摧毁一座建筑。' },
];

const d = (name: string, color: string, cost: number, points: number, icon: string, count: number, ability?: string) => Array.from({ length: count }, () => ({ name, color, cost, points, icon, ability }));
export const DISTRICTS: District[] = [
  ...d('神庙', 'blue', 1, 1, '🕯️', 3), ...d('教堂', 'blue', 2, 2, '⛪', 3), ...d('修道院', 'blue', 3, 3, '📜', 3), ...d('大教堂', 'blue', 5, 5, '🕍', 2),
  ...d('瞭望塔', 'red', 1, 1, '🔭', 3), ...d('监狱', 'red', 2, 2, '🧱', 3), ...d('战场', 'red', 3, 3, '⚔️', 3), ...d('要塞', 'red', 5, 5, '🏰', 2),
  ...d('庄园', 'yellow', 3, 3, '🏡', 5), ...d('城堡', 'yellow', 4, 4, '🏯', 4), ...d('宫殿', 'yellow', 5, 5, '🏛️', 3),
  ...d('酒馆', 'green', 1, 1, '🍻', 5), ...d('商栈', 'green', 2, 2, '🏪', 3), ...d('集市', 'green', 2, 2, '🧺', 4), ...d('船坞', 'green', 3, 3, '⚓', 3), ...d('港口', 'green', 4, 4, '🚢', 3), ...d('市政厅', 'green', 5, 5, '🏛️', 2),
  ...d('图书馆', 'purple', 6, 6, '📚', 1, 'library'), ...d('巨龙门', 'purple', 6, 8, '🐉', 1, 'dragon-gate'), ...d('墓地', 'purple', 5, 5, '🪦', 1, 'graveyard'), ...d('鬼城', 'purple', 2, 2, '👻', 1, 'ghost-city'), ...d('魔法学院', 'purple', 6, 6, '🔮', 1, 'magic-school'), ...d('实验室', 'purple', 5, 5, '⚗️', 1, 'laboratory'), ...d('铁匠铺', 'purple', 5, 5, '🔨', 1, 'smithy'), ...d('天文台', 'purple', 5, 5, '🔭', 1, 'observatory'), ...d('大学', 'purple', 6, 8, '🎓', 1, 'university'), ...d('堡垒', 'purple', 3, 3, '🧱', 1, 'citadel'), ...d('长城', 'purple', 6, 6, '🧱', 1, 'great-wall'),
];

const clone = (x: District): District => ({ ...x });
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
export type GameState = { phase: Phase; round: number; players: Player[]; deck: District[]; discard: District[]; currentPlayer: number; picker: number; pickerOrder: number[]; picksMade: number; chosen: CharacterId[]; revealed: CharacterId[]; rolePool: CharacterId[]; removedFaceUp: CharacterId[]; removedFaceDown: number; log: string[]; finishAfterRound: boolean; finisherId?: number; endThreshold: number; crownHolder: number; assassinTarget?: CharacterId; thiefTarget?: CharacterId; winner?: string; pendingDistrictChoice?: { player: number; cards: District[] }; drawEvents: DrawEvent[]; nextDrawEventId: number };

function threshold(total: number) { return total === 2 ? 10 : total === 3 ? 10 : total === 7 ? 7 : 8; }
function faceUpCount(total: number) { return total <= 4 ? 2 : total === 5 ? 1 : 0; }
function setupRoles(state: GameState) {
  const total = state.players.length;
  let candidates = CHARACTERS.filter(c => !(total === 3 && c.id === '刺客'));
  const up = shuffle(candidates.filter(c => c.id !== '国王')).slice(0, faceUpCount(total)).map(c => c.id);
  const hiddenCount = total >= 8 ? 0 : 1;
  const remaining = shuffle(candidates.filter(c => !up.includes(c.id)));
  const hidden = remaining.splice(0, hiddenCount);
  const selectable = total === 2 ? remaining.concat(hidden) : remaining.slice(0, Math.min(total + 1, remaining.length));
  state.removedFaceUp = up; state.removedFaceDown = hidden.length; state.rolePool = selectable.map(c => c.id); state.chosen = []; state.picksMade = 0;
  state.pickerOrder = Array.from({ length: total }, (_, i) => (state.crownHolder + i) % total); state.picker = state.pickerOrder[0] ?? 0;
  state.players.forEach(p => { p.character = undefined; p.lastAction = '等待选择角色'; p.abilityUsed = false; p.usedAbilities = []; p.incomeClaimed = false; p.incomeChoice = undefined; p.turnPrepared = false; });
}
export function createGame(total: number, humans: number): GameState {
  const players = Array.from({ length: total }, (_, i) => ({ id: i, name: i < humans ? `玩家 ${i + 1}` : `AI 城主 ${i + 1}`, human: i < humans, coins: 2, hand: [] as District[], city: [] as District[], lastAction: '等待选择角色', buildsThisTurn: 0, abilityUsed: false, usedAbilities: [] as number[], incomeClaimed: false }));
  const deck = shuffle(DISTRICTS).map(clone); players.forEach(p => p.hand.push(...deck.splice(0, 4)));
  const state: GameState = { phase: 'choose', round: 1, players, deck, discard: [], currentPlayer: 0, picker: 0, pickerOrder: [], picksMade: 0, chosen: [], revealed: [], rolePool: [], removedFaceUp: [], removedFaceDown: 0, log: ['第一轮开始：选择角色。'], finishAfterRound: false, endThreshold: threshold(total), crownHolder: 0, pendingDistrictChoice: undefined, drawEvents: [], nextDrawEventId: 1 };
  setupRoles(state); return state;
}
export function roleFor(state: GameState, index: number) { return state.players[index].character; }
function rank(id?: CharacterId) { return CHARACTERS.find(c => c.id === id)?.rank ?? 99; }
function nextCharacterPlayer(state: GameState, afterRank: number) { return state.players.filter(p => p.character && rank(p.character) > afterRank).sort((a, b) => rank(a.character) - rank(b.character))[0]?.id ?? -1; }
export function chooseCharacter(state: GameState, index: number, character: CharacterId) { if (state.phase !== 'choose' || index !== state.picker || !state.rolePool.includes(character) || state.chosen.includes(character)) return false; const p = state.players[index]; p.character = character; p.lastAction = `选择了${character}`; state.chosen.push(character); state.rolePool = state.rolePool.filter(x => x !== character); state.picksMade++; state.log.unshift(`${p.name} 选择了 ${character}。`); if (state.picksMade >= state.players.length) { state.phase = 'income'; state.currentPlayer = nextCharacterPlayer(state, 0); state.log.unshift('角色选择完成，按编号顺序行动。'); } else state.picker = state.pickerOrder[state.picksMade]; return true; }
export function draw(state: GameState, count: number, recipient?: number) {
  if (count <= 0) return [];
  if (!state.drawEvents) state.drawEvents = [];
  if (!state.nextDrawEventId) state.nextDrawEventId = 1;
  if (state.deck.length < count && state.discard.length) state.deck.push(...shuffle(state.discard.splice(0)));
  const cards = state.deck.splice(0, count);
  if (recipient !== undefined && cards.length) state.drawEvents.push({ id: state.nextDrawEventId++, player: recipient, count: cards.length });
  return cards;
}
function bottom(state: GameState, card: District) { state.deck.push(card); }
/** Prepare a revealed character once, before any basic action or active ability. */
export function beginTurn(state: GameState): Player | null {
  if (state.phase !== 'income') return state.phase === 'build' ? state.players[state.currentPlayer] ?? null : null;
  const p = state.players[state.currentPlayer];
  if (!p?.character) return null;
  if (p.turnPrepared) return p;
  p.turnPrepared = true;
  p.buildsThisTurn = 0;
  p.abilityUsed = false;
  p.usedAbilities = [];
  p.incomeClaimed = false;
  p.incomeChoice = undefined;
  // The king keeps the crown even when assassinated. Do not reveal a killed
  // role here: its owner stays silent until all surviving roles have acted.
  if (p.character === '国王') state.crownHolder = p.id;
  if (p.character === state.assassinTarget) {
    p.lastAction = '本轮被刺杀，跳过行动';
    endTurn(state);
    return null;
  }
  if (!state.revealed.includes(p.character)) state.revealed.push(p.character);
  resolveThief(state, p);
  return p;
}
function countsColor(p: Player, color: string) { return p.city.filter(c => c.color === color || (c.ability === 'magic-school' && ['blue', 'red', 'yellow', 'green'].includes(color))).length; }
function afterBasicAction(state: GameState, p: Player) {
  if (p.character === '商人') p.coins += 1;
  if (p.character === '建筑师') p.hand.push(...draw(state, 2, p.id));
}
function startBuild(state: GameState, p: Player, action: string) { p.lastAction = action; state.phase = 'build'; state.log.unshift(`${p.name} ${action}。`); }
export function takeCoins(state: GameState) { if (state.phase !== 'income') return false; const p = beginTurn(state); if (!p || p.incomeClaimed) return false; p.incomeClaimed = true; p.incomeChoice = 'coins'; p.coins += 2; afterBasicAction(state, p); startBuild(state, p, '抽取金币牌'); return true; }
export function drawCards(state: GameState) {
  if (state.phase !== 'income' || state.pendingDistrictChoice) return false;
  const p = beginTurn(state);
  if (!p || p.incomeClaimed) return false;
  p.incomeClaimed = true;
  p.incomeChoice = 'cards';
  // Present the two drawn cards as a short-lived choice.  The selected card
  // goes to the player's hand and the other one is discarded after the user
  // makes a choice.  Keep the draw count at two so the UI always mirrors the
  // income action, including for special buildings.
  const pulled = draw(state, 2, p.id);
  state.pendingDistrictChoice = pulled.length ? { player: p.id, cards: pulled } : undefined;
  afterBasicAction(state, p);
  startBuild(state, p, '抽取地区卡牌');
  if (!state.pendingDistrictChoice) p.lastAction = '抽取地区卡牌（牌库暂时为空）';
  return true;
}
export function chooseDistrictCard(state: GameState, index: number) {
  const pending = state.pendingDistrictChoice;
  if (state.phase !== 'build' || !pending || pending.player !== state.currentPlayer) return false;
  const p = state.players[pending.player];
  const selected = pending.cards[index];
  if (!p || !selected) return false;
  p.hand.push(selected);
  pending.cards.forEach((card, cardIndex) => { if (cardIndex !== index) state.discard.push(card); });
  state.pendingDistrictChoice = undefined;
  p.lastAction = `选择了${selected.name}`;
  state.log.unshift(`${p.name} 选择了 ${selected.icon} ${selected.name}。`);
  return true;
}
export function startIncome(state: GameState) { return takeCoins(state); }
export function build(state: GameState, playerIndex: number, cardIndex: number) { if (state.phase !== 'build' || state.currentPlayer !== playerIndex || state.pendingDistrictChoice) return false; const p = state.players[playerIndex]; const card = p.hand[cardIndex]; const limit = p.character === '建筑师' ? 3 : 1; if (!card || p.coins < card.cost || p.city.some(c => c.name === card.name) || p.city.length >= state.endThreshold || p.buildsThisTurn >= limit) return false; p.coins -= card.cost; p.city.push(card); p.hand.splice(cardIndex, 1); p.buildsThisTurn++; p.lastAction = `建造了${card.name}`; state.log.unshift(`${p.name} 建造了 ${card.icon} ${card.name}。`); if (p.city.length >= state.endThreshold && state.finisherId === undefined) { state.finisherId = p.id; state.finishAfterRound = true; } return true; }
function ensureAbilityFields(p: Player) { if (!Array.isArray(p.usedAbilities)) p.usedAbilities = []; }
function abilityIsUsed(p: Player, index: number) {
  ensureAbilityFields(p);
  // The magician's alternatives share a use. Other independent abilities,
  // such as the warlord's tax and destruction, each have their own use.
  return p.character === '魔法师' ? p.abilityUsed || p.usedAbilities.length > 0 : p.usedAbilities.includes(index);
}
export { abilityIsUsed };
function markAbilityUsed(p: Player, index: number) { ensureAbilityFields(p); if (!p.usedAbilities.includes(index)) p.usedAbilities.push(index); p.abilityUsed = true; }

export function destructionCost(state: GameState, victimId: number, districtIndex: number) {
  const victim = state.players[victimId];
  const card = victim?.city[districtIndex];
  return card ? Math.max(0, card.cost - 1) + (card.ability !== 'great-wall' && victim.city.some(district => district.ability === 'great-wall') ? 1 : 0) : Number.POSITIVE_INFINITY;
}
export function canDestroyDistrict(state: GameState, actorId: number, victimId: number, districtIndex: number) {
  const actor = state.players[actorId];
  const victim = state.players[victimId];
  const card = victim?.city[districtIndex];
  if (!actor || !victim || actor.character !== '领主' || abilityIsUsed(actor, 1)) return false;
  if (!card || card.ability === 'citadel' || victim.character === '主教' || victim.city.length >= state.endThreshold) return false;
  return actor.coins >= destructionCost(state, victimId, districtIndex);
}

export function useCharacterAbility(state: GameState, playerIndex: number, abilityIndex: 0 | 1, target?: AbilityTarget): boolean {
  if (!['income', 'build'].includes(state.phase) || state.currentPlayer !== playerIndex || state.pendingDistrictChoice) return false;
  if (state.phase === 'income' && beginTurn(state)?.id !== playerIndex) return false;
  const p = state.players[playerIndex];
  if (!p?.character || abilityIsUsed(p, abilityIndex)) return false;
  const role = p.character;
  if (role === '刺客' && abilityIndex === 0 && typeof target === 'string' && target !== role && CHARACTERS.some(x => x.id === target)) {
    state.assassinTarget = target; markAbilityUsed(p, 0); p.lastAction = `暗杀了${target}`; state.log.unshift(`${p.name} 宣布暗杀${target}。`); return true;
  }
  if (role === '盗贼' && abilityIndex === 0 && typeof target === 'string' && target !== role && target !== '刺客' && target !== state.assassinTarget && !state.removedFaceUp.includes(target) && !state.revealed.includes(target) && CHARACTERS.some(x => x.id === target)) {
    state.thiefTarget = target; markAbilityUsed(p, 0); p.lastAction = `准备偷窃${target}`; state.log.unshift(`${p.name} 宣布偷窃${target}。`); return true;
  }
  if (role === '魔法师' && abilityIndex === 0 && typeof target === 'object' && target !== null && 'player' in target && Number.isInteger(target.player) && target.player !== playerIndex && !!state.players[target.player]) {
    const other = state.players[target.player]; [p.hand, other.hand] = [other.hand, p.hand]; markAbilityUsed(p, 0); p.lastAction = `与${other.name}交换手牌`; return true;
  }
  if (role === '魔法师' && abilityIndex === 1 && typeof target === 'object' && target !== null && 'cards' in target) {
    const indexes = target.cards;
    if (!Array.isArray(indexes) || !indexes.length || new Set(indexes).size !== indexes.length || indexes.some(index => !Number.isInteger(index) || index < 0 || index >= p.hand.length)) return false;
    const selected = new Set(indexes);
    const discarded = p.hand.filter((_card, index) => selected.has(index));
    p.hand = p.hand.filter((_card, index) => !selected.has(index));
    discarded.forEach(card => bottom(state, card));
    p.hand.push(...draw(state, discarded.length, p.id));
    markAbilityUsed(p, 1); p.lastAction = `弃${discarded.length}张牌后重新抽取`; return true;
  }
  const colors: Partial<Record<CharacterId, string>> = { 国王: 'yellow', 主教: 'blue', 商人: 'green', 领主: 'red' };
  if (colors[role] && ((abilityIndex === 1 && role === '国王') || (abilityIndex === 0 && role !== '国王'))) {
    const color = colors[role]!; const income = countsColor(p, color); p.coins += income; markAbilityUsed(p, abilityIndex); p.lastAction = `获得${color}地区收入`; return true;
  }
  if (role === '领主' && abilityIndex === 1 && state.phase === 'build' && typeof target === 'object' && target !== null && 'player' in target && Number.isInteger(target.player) && Number.isInteger(target.district) && target.district !== undefined && canDestroyDistrict(state, playerIndex, target.player, target.district)) {
    const victim = state.players[target.player]; const destroyed = victim.city[target.district]; const cost = destructionCost(state, target.player, target.district); p.coins -= cost; victim.city.splice(target.district, 1); state.discard.push(destroyed); markAbilityUsed(p, 1); p.lastAction = `摧毁了${victim.name}的${destroyed.name}`; endTurn(state); return true;
  }
  return false;
}

/** Backwards-compatible adapter for the original UI event handlers. */
export function useAbility(state: GameState, playerIndex: number, target?: number | CharacterId, discardCount = 0) {
  const p = state.players[playerIndex];
  if (p?.character === '魔法师' && Number.isInteger(discardCount) && discardCount > 0 && discardCount <= p.hand.length) return useCharacterAbility(state, playerIndex, 1, { cards: Array.from({ length: discardCount }, (_, index) => index) });
  if (p?.character === '魔法师' && typeof target === 'number') return useCharacterAbility(state, playerIndex, 0, { player: target });
  if ((p?.character === '刺客' || p?.character === '盗贼') && typeof target === 'string') return useCharacterAbility(state, playerIndex, 0, target);
  // Destruction must name the exact building. The legacy player-only adapter
  // cannot safely infer that choice, so callers should use useCharacterAbility
  // with { player, district } instead.
  if (p?.character === '领主' && typeof target === 'number') return false;
  return false;
}
function resolveThief(state: GameState, p: Player) { if (p.character && p.character === state.thiefTarget) { const thief = state.players.find(x => x.character === '盗贼'); if (thief) { thief.coins += p.coins; p.coins = 0; } state.thiefTarget = undefined; } }
export function endTurn(state: GameState) {
  if (state.pendingDistrictChoice) return;
  const current = state.players[state.currentPlayer]; const next = nextCharacterPlayer(state, rank(current?.character)); if (next >= 0) { state.currentPlayer = next; state.phase = 'income'; return; } state.round++; if (state.finishAfterRound) { state.phase = 'ended'; score(state); state.log.unshift('本轮结束，开始计分。'); return; } state.revealed = []; state.assassinTarget = undefined; state.thiefTarget = undefined; state.finisherId = undefined; state.finishAfterRound = false; setupRoles(state); state.currentPlayer = 0; state.phase = 'choose'; state.log.unshift(`第 ${state.round} 轮开始。`); }
export function score(state: GameState) { const first = state.finisherId; state.players.forEach(p => { p.lastAction = `总分 ${totalScore(p, first, state.endThreshold)} 分`; }); state.winner = [...state.players].sort((a, b) => totalScore(b, first, state.endThreshold) - totalScore(a, first, state.endThreshold))[0]?.name; }
function hasFiveColors(p: Player) { const colors = new Set(p.city.map(c => c.color)); if (p.city.some(c => c.ability === 'ghost-city')) for (const c of ['blue', 'red', 'yellow', 'green']) colors.add(c); return ['blue', 'red', 'yellow', 'green', 'purple'].every(c => colors.has(c)); }
export function totalScore(p: Player, firstId?: number, endThreshold = 8) { return p.city.reduce((n, c) => n + c.points, 0) + (hasFiveColors(p) ? 3 : 0) + (p.city.length >= endThreshold ? (p.id === firstId ? 4 : 2) : 0); }
export function aiAct(state: GameState) {
  const p = state.players[state.currentPlayer]; if (!p || p.human) return;
  if (state.phase === 'income' && !takeCoins(state)) return;
  if (state.phase === 'build') {
    if (state.pendingDistrictChoice?.player === p.id) {
      const cards = state.pendingDistrictChoice.cards;
      const best = cards.map((card, index) => ({ card, index })).sort((a, b) => b.card.points - a.card.points)[0];
      if (best) chooseDistrictCard(state, best.index);
    }
    if (p.character === '刺客' || p.character === '盗贼') {
      // Choose a role rather than peeking at another player's hidden role.
      const targets = CHARACTERS.filter(role => role.rank > rank(p.character) && !state.removedFaceUp.includes(role.id) && role.id !== state.assassinTarget && (p.character !== '盗贼' || !state.revealed.includes(role.id)));
      const target = targets[Math.floor(Math.random() * targets.length)]?.id;
      if (target) useCharacterAbility(state, p.id, 0, target);
    }
    if (p.character === '魔法师') {
      const other = state.players.filter(player => player.id !== p.id && player.hand.length > p.hand.length).sort((a, b) => b.hand.length - a.hand.length)[0];
      if (other) useCharacterAbility(state, p.id, 0, { player: other.id });
      else {
        const cards = p.hand.map((card, index) => ({ card, index })).filter(({ card }) => p.city.some(built => built.name === card.name) || card.cost > p.coins + 2).map(({ index }) => index);
        if (cards.length) useCharacterAbility(state, p.id, 1, { cards });
      }
    }
    const incomeIndex = p.character === '国王' ? 1 : ['主教', '商人', '领主'].includes(p.character ?? '') ? 0 : undefined;
    const limit = p.character === '建筑师' ? 3 : 1;
    while (p.buildsThisTurn < limit) {
      const choice = p.hand.map((c, i) => ({ c, i })).filter(x => x.c.cost <= p.coins && !p.city.some(c => c.name === x.c.name)).sort((a, b) => b.c.points - a.c.points)[0];
      if (!choice) {
        if (incomeIndex !== undefined && !abilityIsUsed(p, incomeIndex)) { useCharacterAbility(state, p.id, incomeIndex); continue; }
        break;
      }
      if (!build(state, p.id, choice.i)) break;
    }
    // Claim after construction when possible so a new matching district also
    // contributes. If funds were needed above, its one-use lock prevents repeats.
    if (incomeIndex !== undefined) useCharacterAbility(state, p.id, incomeIndex);
    if (p.character === '领主') {
      const target = state.players.filter(player => player.id !== p.id).flatMap(player => player.city.map((card, district) => ({ player: player.id, district, card }))).filter(target => canDestroyDistrict(state, p.id, target.player, target.district)).sort((a, b) => b.card.points - a.card.points)[0];
      if (target && useCharacterAbility(state, p.id, 1, { player: target.player, district: target.district })) return;
    }
    endTurn(state);
  }
}
