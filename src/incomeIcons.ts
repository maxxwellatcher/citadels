import './incomeIcons.css';

const FRAME = `<rect class="income-emblem-field" x="3" y="3" width="58" height="58" rx="11"/>
  <path class="income-emblem-rim" d="M8 20V15A7 7 0 0 1 15 8H24M56 44V49A7 7 0 0 1 49 56H40"/>`;

const COINS_ART = `<g class="income-symbol">
  <path class="income-coin-side" d="M12 24V28C12 35 17 40 24 40S36 35 36 28V24Z"/>
  <path class="income-coin-edges" d="M18 35V38M24 36V39M30 35V38"/>
  <circle class="income-coin-face" cx="24" cy="24" r="12"/>
  <circle class="income-coin-inset" cx="24" cy="24" r="8.7"/>
  <path class="income-coin-cut" d="M24 18 28 24 24 30 20 24Z"/>
  <path class="income-glint" d="M17 20A8 8 0 0 1 27 17"/>
  <path class="income-coin-side" d="M25 37V42C25 50 31 56 39 56S53 50 53 42V37Z"/>
  <path class="income-coin-edges" d="M31 48V52M37 51V55M43 51V55M49 48V52"/>
  <circle class="income-coin-face" cx="39" cy="37" r="14"/>
  <circle class="income-coin-inset" cx="39" cy="37" r="10.5"/>
  <path class="income-coin-cut" d="M39 29 44 37 39 45 34 37Z"/>
  <path class="income-glint" d="M29 33A10.5 10.5 0 0 1 42 27M36 35 39 31"/>
</g>`;

const CARDS_ART = `<g class="income-symbol">
  <g transform="rotate(-12 26 30)">
    <rect class="income-card-back" x="12" y="11" width="28" height="39" rx="3.5"/>
    <rect class="income-card-back-inset" x="16" y="15" width="20" height="31" rx="1.5"/>
    <path class="income-card-back-mark" d="M26 23 31 30 26 37 21 30Z"/>
    <path class="income-glint" d="M17 18H29"/>
  </g>
  <g transform="rotate(8 38 35)">
    <rect class="income-card-paper" x="23" y="15" width="29" height="40" rx="3.5"/>
    <rect class="income-card-panel" x="27" y="20" width="21" height="28" rx="1.5"/>
    <path class="income-building-wall" d="M30 34H45V47H30Z"/>
    <path class="income-building-roof" d="M28 34 37.5 25 47 34Z"/>
    <path class="income-building-door" d="M35 47V41A2.5 2.5 0 0 1 40 41V47Z"/>
    <path class="income-building-window" d="M32 36H34V39H32ZM41 36H43V39H41Z"/>
    <path class="income-card-label" d="M29 51H46"/>
    <path class="income-glint" d="M27 17H44"/>
  </g>
</g>`;

/** Decorative action mark; the card supplies its accessible action label. */
export function renderIncomeIcon(type: 'coins' | 'cards'): string {
  const kind = type === 'cards' ? 'cards' : 'coins';
  const art = kind === 'cards' ? CARDS_ART : COINS_ART;
  return `<svg class="income-emblem income-emblem--${kind}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${FRAME}${art}</svg>`;
}
