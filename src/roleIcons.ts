import type { CharacterId } from './game';
import './roleIcons.css';

// Static artwork only: these emblems can appear many times without shared SVG IDs.
const ROLE_ART: Record<CharacterId, { className: string; symbol: string }> = {
  '刺客': {
    className: 'assassin',
    symbol: `<g transform="rotate(35 32 32)">
      <path class="role-metal" d="M32 10 39 22 35 37H29L25 22Z"/>
      <path class="role-bevel" d="M32 13V35L28 23Z"/>
      <path class="role-engraving" d="M32 15V33"/>
      <path class="role-metal" d="M22 36H42V41H22Z"/>
      <path class="role-shade" d="M29 41H35V51H29Z"/>
      <path class="role-engraving" d="M29 44H35M29 48H35"/>
      <path class="role-metal" d="M27 51H37V55H27Z"/>
      <path class="role-glint" d="M24 37H39"/>
    </g>`,
  },
  '盗贼': {
    className: 'thief',
    symbol: `<path class="role-metal" d="M32 11C22 16 16 27 14 43L23 51H41L50 43C48 27 42 16 32 11Z"/>
      <path class="role-shade" d="M32 13C22 23 19 38 19 45L25 49H23L16 42C18 27 23 19 32 13Z"/>
      <path class="role-cutout" d="M32 21C25 25 21 32 22 40L32 46 42 40C43 32 39 25 32 21Z"/>
      <path class="role-mask" d="M22 35 32 38 42 35V40L32 47 22 40Z"/>
      <path class="role-eyes" d="M25 31 29 32M35 32 39 31"/>
      <path class="role-engraving" d="M32 14V18M17 42 23 39M47 42 41 39"/>
      <path class="role-glint" d="M24 21C26 18 29 16 31 15"/>`,
  },
  '魔法师': {
    className: 'magician',
    symbol: `<path class="role-accent" d="M23 40 17 44C14 47 12 50 15 55H49C52 50 50 47 45 44L38 40Z"/>
      <path fill="var(--role-highlight)" stroke="var(--role-shadow)" stroke-width="1.4" d="M23 31H40V37C40 42 36 44 31 44 27 44 23 41 23 37Z"/>
      <path class="role-metal" d="M23 37 27 39 31 40 36 39 40 37C39 44 35 47 31 50 27 47 24 43 23 37Z"/>
      <path class="role-engraving" d="M27 35H28M35 35H36"/>
      <path fill="var(--role-accent)" stroke="var(--role-metal)" stroke-width="1.6" d="M17 30 24 17C28 11 33 9 43 13L35 18 41 30Z"/>
      <path class="role-bevel" d="M26 18C29 14 32 12 38 13L31 17 25 27H21Z"/>
      <path class="role-metal" d="M19 26H39L41 30H17Z"/>
      <path class="role-metal" d="M14 29H45C49 29 51 32 49 34H11C9 32 11 29 14 29Z"/>
      <path fill="var(--role-highlight)" d="M46 36 48 40 52 42 48 44 46 48 44 44 40 42 44 40Z"/>`,
  },
  '国王': {
    className: 'king',
    symbol: `<path class="role-metal" d="M13 23 24 30 32 15 40 30 51 23 46 44H18Z"/>
      <path class="role-shade" d="M15 27 24 33 20 42H18ZM32 19V42H27L25 32Z"/>
      <path class="role-metal" d="M18 43H46V50H18Z"/>
      <path class="role-glint" d="M20 45H44"/>
      <path class="role-engraving" d="M20 48H44"/>
      <path class="role-accent" d="M32 31 36 36 32 41 28 36Z"/>
      <circle class="role-metal" cx="13" cy="22" r="2.4"/>
      <circle class="role-metal" cx="32" cy="14" r="2.4"/>
      <circle class="role-metal" cx="51" cy="22" r="2.4"/>`,
  },
  '主教': {
    className: 'bishop',
    symbol: `<path class="role-accent" d="M24 39 17 42C14 44 12 47 12 50L15 55H49L52 50C52 47 50 44 47 42L40 39Z"/>
      <path fill="var(--role-highlight)" stroke="var(--role-shadow)" stroke-width="1.4" d="M23 29H41V35C41 40 36 43 32 43 28 43 23 40 23 35Z"/>
      <path class="role-metal" d="M23 35 27 36 32 38 37 36 41 35C40 41 36 43 32 45 28 43 24 41 23 35Z"/>
      <path class="role-engraving" d="M27 33.5H28M36 33.5H37"/>
      <path class="role-metal" d="M32 9C24 15 19 21 19 29H45C45 21 40 15 32 9Z"/>
      <path class="role-bevel" d="M32 12V27H22C23 21 27 16 32 12Z"/>
      <path class="role-cross" d="M32 16V25M27 20H37"/>
      <path class="role-accent" d="M19 27H45V30H19Z"/>
      <path fill="var(--role-highlight)" d="M30 45H34V48H39V51H34V55H30V51H25V48H30Z"/>`,
  },
  '商人': {
    className: 'merchant',
    symbol: `<path class="role-metal" d="M24 14C29 17 35 17 41 14L37 24H27Z"/>
      <path class="role-metal" d="M27 25H37C39 31 45 34 45 42 45 49 39 52 31 52 23 52 18 49 18 42 18 35 24 30 27 25Z"/>
      <path class="role-shade" d="M27 27C24 34 22 36 22 43 22 47 24 49 27 51 21 50 19 47 19 42 19 36 24 31 27 27Z"/>
      <path class="role-tie" d="M25 24H39M27 27 25 31M37 27 40 31"/>
      <path class="role-engraving" d="M29 34C25 36 25 41 29 43M33 33V45"/>
      <circle class="role-metal" cx="46" cy="44" r="8"/>
      <circle class="role-coin-inset" cx="46" cy="44" r="5.3"/>
      <path class="role-accent" d="M46 40 49 44 46 48 43 44Z"/>
      <path class="role-glint" d="M28 17C31 18 35 18 37 17M42 39C43 38 45 37 47 38"/>`,
  },
  '建筑师': {
    className: 'architect',
    symbol: `<path class="role-metal" d="M15 26H48C50 26 51 28 51 30V51H15C12 51 10 49 10 46V30C10 28 12 26 15 26Z"/>
      <path class="role-accent" d="M17 29H48V48H17Z"/>
      <path class="role-engraving" d="M16 27V46C16 49 13 50 11 48"/>
      <path fill="none" stroke="var(--role-metal)" stroke-width="1.8" d="M20 35H28V44H20ZM20 39H28M41 43H46"/>
      <path class="role-metal" d="M34 19 22 47 27 44 37 23ZM38 19 49 47 48 40 40 22Z"/>
      <path class="role-metal" d="M28 34H43V37H28Z"/>
      <path class="role-metal" d="M34 10H38V14H34Z"/>
      <circle class="role-metal" cx="36" cy="18" r="5.5"/>
      <circle class="role-accent" cx="36" cy="18" r="2.2"/>
      <path class="role-glint" d="M32 26 27 38M40 26 44 36"/>`,
  },
  '领主': {
    className: 'warlord',
    symbol: `<path class="role-metal" d="M12 12 20 16 48 44 44 48 16 20ZM52 12 48 20 20 48 16 44 44 16Z"/>
      <path class="role-blade-line" d="M17 17 24 24M47 17 40 24"/>
      <path class="role-sword-grip" d="M44 44 51 51M20 44 13 51"/>
      <path class="role-sword-guard" d="M41 48 48 41M16 41 23 48"/>
      <path class="role-metal" d="M18 23 32 17 46 23 44 40C42 47 36 51 32 54 28 51 22 47 20 40Z"/>
      <path class="role-accent" d="M22 26 32 22 42 26 40 39C39 44 35 48 32 50 29 48 25 44 24 39Z"/>
      <path class="role-shield-shade" d="M32 23V49C29 47 26 43 25 39L23 27Z"/>
      <path class="role-crest" d="M26 38 32 31 38 38M32 32V43"/>
      <path class="role-glint" d="M21 25 31 20"/>`,
  },
};

const FRAME = `<circle class="role-rim" cx="32" cy="32" r="29"/>
  <circle class="role-field" cx="32" cy="32" r="25.5"/>
  <path class="role-rim-glint" d="M10 22A24 24 0 0 1 43 10M54 42A24 24 0 0 1 21 54"/>
  <path class="role-rim-detail" d="M30 5H34M30 59H34M5 30V34M59 30V34"/>`;

/** Decorative role mark; the surrounding UI provides the readable role name. */
export function renderRoleIcon(id?: CharacterId): string {
  const art = id && Object.prototype.hasOwnProperty.call(ROLE_ART, id) ? ROLE_ART[id] : undefined;
  if (!art) return '<span class="role-emblem role-emblem--unknown" aria-hidden="true">✦</span>';
  return `<svg class="role-emblem role-emblem--${art.className}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${FRAME}<g class="role-symbol">${art.symbol}</g></svg>`;
}
