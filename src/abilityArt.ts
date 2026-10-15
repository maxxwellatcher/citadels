import type { CharacterId } from './game';

// Static skill artwork. The shared ability emblem supplies the outer frame.
const mark = (body: string) => `<g fill="var(--ability-stone)" stroke="var(--ability-ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
const coin = `<circle cx="44" cy="44" r="8" fill="var(--ability-gold)"/><path d="M44 39 48 44 44 49 40 44Z" fill="var(--ability-accent)" stroke-width="1.8"/>`;

export const ABILITY_ART: Partial<Record<CharacterId, [string, string | null]>> = {
  '刺客': [mark(`
    <circle cx="44" cy="23" r="8" fill="none" stroke="var(--ability-accent)" stroke-width="3"/>
    <path d="M44 17V29M38 23H50" fill="none" stroke="var(--ability-accent)" stroke-width="2.6"/>
    <path d="M23 34 44 23 34 41 28 40Z"/>
    <path d="M28 35 39 27" fill="none" stroke="var(--ability-gold)" stroke-width="2"/>
    <path d="M18 47 24 41" fill="none" stroke="var(--ability-stone)" stroke-width="6"/>
    <path d="M20 33 31 44" fill="none" stroke="var(--ability-gold)" stroke-width="5"/>
    <circle cx="17" cy="48" r="3" fill="var(--ability-gold)"/>
  `), null],
  '盗贼': [mark(`
    <circle cx="42" cy="22" r="8" fill="var(--ability-gold)"/>
    <path d="M42 17 46 22 42 27 38 22Z" fill="var(--ability-accent)" stroke-width="1.8"/>
    <path d="M14 43 25 34C28 31 30 32 32 34L37 30C40 28 43 29 43 32L40 39 34 46 25 50Z"/>
    <path d="M26 40 32 35" fill="none"/>
    <path d="M17 40 25 47 21 52 14 45Z" fill="var(--ability-accent)"/>
  `), null],
  '魔法师': [mark(`
    <rect x="15" y="25" width="14" height="18" rx="2"/>
    <rect x="35" y="25" width="14" height="18" rx="2" fill="var(--ability-accent)"/>
    <path d="M22 29 26 34 22 39 18 34Z" fill="var(--ability-accent)" stroke-width="1.5"/>
    <path d="M42 29 46 34 42 39 38 34Z" stroke-width="1.5"/>
    <path d="M18 19H45M40 14 45 19 40 24M46 48H19M24 44 19 48 24 52" fill="none" stroke="var(--ability-gold)" stroke-width="3.5"/>
  `), mark(`
    <rect x="23" y="23" width="17" height="21" rx="2.5"/>
    <path d="M31.5 28 36 33.5 31.5 39 27 33.5Z" fill="var(--ability-accent)" stroke-width="1.8"/>
    <path d="M44 18A18 18 0 1 0 49 38" fill="none" stroke="var(--ability-gold)" stroke-width="3.8"/>
    <path d="M49 38 50 47 41 44Z" fill="var(--ability-gold)" stroke="var(--ability-gold)" stroke-width="1.5"/>
  `)],
  '国王': [mark(`
    <path d="M14 24 23 30 32 16 41 30 50 24 46 44H18Z" fill="var(--ability-gold)"/>
    <path d="M18 43H46V50H18Z" fill="var(--ability-gold)"/>
    <path d="M32 30 37 35 32 40 27 35Z" fill="var(--ability-accent)" stroke-width="1.8"/>
  `), mark(`
    <path d="M14 27 29 17 44 27Z" fill="var(--ability-accent)"/>
    <path d="M16 28H42V33H16ZM18 33H24V46H18ZM33 33H39V46H33ZM15 46H43V51H15Z"/>
    <path d="M22 24 29 20 36 24" fill="none" stroke="var(--ability-gold)" stroke-width="2"/>
    ${coin}
  `)],
  '主教': [mark(`
    <path d="M27 14V23M23 18H31" fill="none" stroke="var(--ability-gold)" stroke-width="3"/>
    <path d="M14 32 27 23 40 32Z" fill="var(--ability-accent)"/>
    <path d="M17 32H37V50H17Z"/>
    <path d="M24 50V42A3 3 0 0 1 30 42V50Z" fill="var(--ability-ink)" stroke-width="1.8"/>
    ${coin}
  `), mark(`
    <path d="M15 20 32 14 49 20 47 36C46 44 39 49 32 52 25 49 18 44 17 36Z" fill="var(--ability-accent)"/>
    <path d="M32 20V27M28 23H36" fill="none" stroke="var(--ability-gold)" stroke-width="3"/>
    <path d="M22 33 32 27 42 33Z" fill="var(--ability-gold)"/>
    <path d="M24 33H40V44H24Z"/>
    <path d="M29 44V39H35V44Z" fill="var(--ability-ink)" stroke-width="1.8"/>
  `)],
};
