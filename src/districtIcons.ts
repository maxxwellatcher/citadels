import type { District } from './game';
import { DISTRICT_ART } from './districtArt';
import { SPECIAL_DISTRICT_ART } from './specialDistrictArt';
import './districtIcons.css';

const ART = { ...DISTRICT_ART, ...SPECIAL_DISTRICT_ART };
const CATEGORIES = ['blue', 'red', 'yellow', 'green', 'purple'];
const FALLBACK = '<path d="M13 29 32 13 51 29" fill="var(--district-roof)"/><path d="M17 29H47V52H17Z"/><path d="M28 52V39H36V52" fill="var(--district-ink)"/>';

/** Render known building artwork without copying markup into game state. */
export function renderDistrictIcon(district: Pick<District, 'name' | 'color'>): string {
  const art = Object.prototype.hasOwnProperty.call(ART, district.name) ? ART[district.name] : FALLBACK;
  const category = CATEGORIES.includes(district.color) ? district.color : 'neutral';
  return `<svg class="district-emblem district-emblem--${category}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect class="district-emblem-field" x="3" y="3" width="58" height="58" rx="11"/><path class="district-emblem-rim" d="M8 20V15A7 7 0 0 1 15 8H24M56 44V49A7 7 0 0 1 49 56H40"/><g fill="var(--district-stone)" stroke="var(--district-gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${art}<path d="M12 55H52" fill="none" opacity=".65"/></g></svg>`;
}
