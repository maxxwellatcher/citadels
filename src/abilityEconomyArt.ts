import type { CharacterId } from './game';

// Static, independent symbols for income, extra cards, construction, and demolition.
export const ABILITY_ECONOMY_ART: Partial<Record<CharacterId, [string, string | null]>> = {
  '商人': [
    `<g stroke="var(--ability-gold)" stroke-width="2.2">
      <path fill="var(--ability-stone)" d="M16 28H44V51H16Z"/>
      <path fill="var(--ability-accent)" d="M14 27 19 17H41L46 27V32Q42 36 38 32Q34 36 30 32Q26 36 22 32Q18 36 14 32Z"/>
      <path fill="none" d="M23 18 21 29M31 18V30M39 18 41 29"/>
      <path fill="var(--ability-ink)" d="M21 39H30V51H21Z"/>
      <circle fill="var(--ability-gold)" stroke="var(--ability-ink)" cx="42" cy="42" r="10"/>
      <circle fill="none" stroke="var(--ability-accent)" cx="42" cy="42" r="6"/>
      <path fill="none" stroke="var(--ability-ink)" d="M42 38V46"/>
    </g>`,
    `<g stroke="var(--ability-gold)" stroke-width="2.2">
      <circle fill="var(--ability-gold)" stroke="var(--ability-ink)" cx="29" cy="37" r="15"/>
      <circle fill="none" stroke="var(--ability-accent)" cx="29" cy="37" r="10"/>
      <path fill="none" stroke="var(--ability-ink)" stroke-width="3" d="M29 31V43"/>
      <path fill="none" stroke="var(--ability-ink)" stroke-width="7" d="M43 15V29M36 22H50"/>
      <path fill="none" stroke="var(--ability-stone)" stroke-width="3.5" d="M43 15V29M36 22H50"/>
    </g>`,
  ],
  '建筑师': [
    `<g stroke="var(--ability-gold)" stroke-width="2.2">
      <rect fill="var(--ability-accent)" x="15" y="14" width="27" height="32" rx="2.5"/>
      <rect fill="var(--ability-stone)" x="24" y="21" width="27" height="31" rx="2.5"/>
      <path fill="var(--ability-accent)" d="M29 34 38 27 47 34H44V42H32V34Z"/>
      <path fill="none" stroke="var(--ability-ink)" d="M37 41V36H40V41"/>
      <path fill="none" stroke="var(--ability-stone)" d="M20 20H26M20 26H23"/>
      <circle fill="var(--ability-accent)" stroke="none" cx="33" cy="47" r="2"/>
      <circle fill="var(--ability-accent)" stroke="none" cx="42" cy="47" r="2"/>
    </g>`,
    `<g stroke="var(--ability-gold)" stroke-width="2.2">
      <path fill="var(--ability-stone)" d="M15 35H25V51H15ZM27 27H38V51H27ZM40 35H50V51H40Z"/>
      <path fill="var(--ability-accent)" d="M14 35 20 27 26 35ZM25 27 32.5 17 40 27ZM39 35 45 27 51 35Z"/>
      <path fill="none" stroke="var(--ability-ink)" stroke-width="3" d="M20 51V43M32.5 51V42M45 51V43"/>
      <path fill="none" stroke="var(--ability-ink)" d="M31 33H34"/>
    </g>`,
  ],
  '领主': [
    `<g stroke="var(--ability-gold)" stroke-width="2.2">
      <path fill="var(--ability-accent)" d="M15 20 30 14 45 20 42 36Q39 46 30 52Q21 46 18 36Z"/>
      <path fill="none" stroke="var(--ability-stone)" stroke-width="3" d="M24 34 30 27 36 34M30 28V41"/>
      <circle fill="var(--ability-gold)" stroke="var(--ability-ink)" cx="42" cy="42" r="10"/>
      <circle fill="none" stroke="var(--ability-accent)" cx="42" cy="42" r="6"/>
      <path fill="none" stroke="var(--ability-ink)" d="M42 38V46"/>
    </g>`,
    `<g stroke="var(--ability-gold)" stroke-width="2.2">
      <path fill="var(--ability-stone)" d="M15 20H21V26H26V20H33V26H38V34L33 38 37 43 33 48 36 52H15Z"/>
      <path fill="none" stroke="var(--ability-ink)" stroke-width="3" d="M26 29 22 35 28 40 24 47"/>
      <path fill="none" stroke="var(--ability-accent)" stroke-width="2" d="M17 42H22M17 48H22"/>
      <path fill="none" stroke="var(--ability-ink)" stroke-width="7" d="M33 43 45 27"/>
      <path fill="none" stroke="var(--ability-gold)" stroke-width="4" d="M33 43 45 27"/>
      <path fill="var(--ability-accent)" d="M35 20 40 14 52 23 47 29Z"/>
      <path fill="none" stroke="var(--ability-stone)" d="M39 20 41 17 48 22"/>
    </g>`,
  ],
};
