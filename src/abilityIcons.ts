import type { CharacterId } from './game';
import { ABILITY_ART } from './abilityArt';
import { ABILITY_ECONOMY_ART } from './abilityEconomyArt';
import './abilityIcons.css';

const ART = { ...ABILITY_ART, ...ABILITY_ECONOMY_ART };
const ROLE_CLASSES: Record<CharacterId, string> = {
  '刺客': 'assassin',
  '盗贼': 'thief',
  '魔法师': 'magician',
  '国王': 'king',
  '主教': 'bishop',
  '商人': 'merchant',
  '建筑师': 'architect',
  '领主': 'warlord',
};

const FRAME = '<rect class="ability-emblem-field" x="3" y="3" width="58" height="58" rx="11"/>';

/** Decorative action artwork; the button supplies the role, skill name and rules. */
export function renderAbilityIcon(role?: CharacterId, index: 0 | 1 = 0): string {
  if (!role || !Object.prototype.hasOwnProperty.call(ROLE_CLASSES, role)) {
    return '<span class="ability-emblem ability-emblem--unknown" aria-hidden="true">✦</span>';
  }
  const art = ART[role]?.[index];
  if (!art) return '<span class="ability-emblem ability-emblem--unknown" aria-hidden="true">✦</span>';
  return `<svg class="ability-emblem ability-emblem--${ROLE_CLASSES[role]}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${FRAME}<g class="ability-symbol" fill="var(--ability-stone)" stroke="var(--ability-gold)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${art}</g></svg>`;
}
