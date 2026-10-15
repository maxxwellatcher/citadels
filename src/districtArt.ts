// Trusted, static SVG fragments. The shared district emblem supplies its frame.
const masonry = (body: string) => `<g fill="var(--district-stone)" stroke="var(--district-ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;

export const DISTRICT_ART: Record<string, string> = {
  '神庙': masonry(`
    <path fill="var(--district-roof)" d="M10 25 32 10 54 25Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M17 22 32 13 47 22"/>
    <rect x="12" y="25" width="40" height="5"/>
    <path d="M16 30H22V48H16ZM29 30H35V48H29ZM42 30H48V48H42Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M18 32V45M31 32V45M44 32V45"/>
    <rect x="12" y="48" width="40" height="4"/>
    <path fill="none" d="M10 54H54"/>
  `),
  '教堂': masonry(`
    <path fill="none" stroke="var(--district-gold)" stroke-width="2.4" d="M22 9V17M19 12H25"/>
    <path fill="var(--district-roof)" d="M14 23 22 15 30 23Z"/>
    <rect x="16" y="23" width="12" height="29"/>
    <path fill="var(--district-ink)" d="M20 34V29A2 2 0 0 1 24 29V34Z"/>
    <path d="M28 34H52V52H28Z"/>
    <path fill="var(--district-roof)" d="M26 34 39 24 54 34Z"/>
    <path fill="var(--district-ink)" d="M35 52V44A4 4 0 0 1 43 44V52Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M20 40H24M39 28V31"/>
  `),
  '修道院': masonry(`
    <rect x="23" y="19" width="18" height="15"/>
    <path fill="var(--district-roof)" d="M21 19 32 10 43 19Z"/>
    <path fill="var(--district-ink)" d="M29 29V24A3 3 0 0 1 35 24V29Z"/>
    <path fill="var(--district-roof)" d="M9 32 18 25H46L55 32Z"/>
    <rect x="11" y="32" width="42" height="20"/>
    <path fill="var(--district-ink)" d="M16 52V41A4 4 0 0 1 24 41V52ZM28 52V41A4 4 0 0 1 36 41V52ZM40 52V41A4 4 0 0 1 48 41V52Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M13 35H51M14 52H50"/>
  `),
  '大教堂': masonry(`
    <path fill="var(--district-roof)" d="M11 19 17 9 23 19ZM41 19 47 9 53 19Z"/>
    <path d="M12 19H22V52H12ZM42 19H52V52H42Z"/>
    <path fill="var(--district-roof)" d="M20 30 32 21 44 30Z"/>
    <path d="M22 30H42V52H22Z"/>
    <circle cx="32" cy="36" r="5" fill="var(--district-roof)" stroke="var(--district-gold)"/>
    <path fill="none" stroke="var(--district-gold)" stroke-width="1.2" d="M32 31V41M27 36H37M28.5 32.5 35.5 39.5M28.5 39.5 35.5 32.5"/>
    <path fill="var(--district-ink)" d="M28 52V47A4 4 0 0 1 36 47V52ZM15 31V25A2 2 0 0 1 19 25V31ZM45 31V25A2 2 0 0 1 49 25V31Z"/>
    <path fill="none" d="M15 39H19M45 39H49"/>
  `),
  '瞭望塔': masonry(`
    <path d="M24 28H40L44 52H20Z"/>
    <rect x="19" y="19" width="26" height="11"/>
    <path fill="var(--district-roof)" d="M16 19 32 9 48 19Z"/>
    <path fill="var(--district-ink)" d="M23 22H28V27H23ZM36 22H41V27H36Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M18 31H46M23 43H41"/>
    <path fill="var(--district-ink)" d="M29 52V45A3 3 0 0 1 35 45V52Z"/>
    <path fill="none" d="M30 35H34"/>
  `),
  '监狱': masonry(`
    <path fill="var(--district-roof)" d="M11 24 18 16H46L53 24Z"/>
    <rect x="13" y="24" width="38" height="28"/>
    <rect x="23" y="32" width="18" height="20" rx="2" fill="var(--district-ink)"/>
    <path fill="none" stroke="var(--district-gold)" stroke-width="2.3" d="M27 34V51M32 34V51M37 34V51M24 40H40"/>
    <path fill="var(--district-ink)" d="M17 28H20V35H17ZM44 28H47V35H44Z"/>
    <path fill="none" d="M14 44H20M43 44H50M17 39H20M44 39H47"/>
  `),
  '战场': masonry(`
    <path fill="none" stroke="var(--district-gold)" stroke-width="2.6" d="M12 12V50M52 12V50"/>
    <path fill="var(--district-roof)" d="M12 13H27L23 21H12ZM52 13H37L41 21H52Z"/>
    <path d="M18 18 25 22 46 43 42 47 21 26ZM46 18 43 26 22 47 18 43 39 22Z"/>
    <path fill="none" stroke="var(--district-gold)" stroke-width="3" d="M18 40 26 48M38 48 46 40M20 45 15 50M44 45 49 50"/>
    <path fill="var(--district-roof)" d="M25 34 32 31 39 34 38 43 32 49 26 43Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M32 34V44"/>
  `),
  '要塞': masonry(`
    <path d="M10 52V17H14V21H18V17H22V52ZM42 52V17H46V21H50V17H54V52Z"/>
    <path d="M22 52V30H26V26H30V30H34V26H38V30H42V52Z"/>
    <path fill="var(--district-roof)" d="M11 22H21V27H11ZM43 22H53V27H43Z"/>
    <path fill="var(--district-ink)" d="M27 52V43A5 5 0 0 1 37 43V52Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M16 33V37M48 33V37M25 35H39"/>
    <path fill="none" d="M11 43H21M43 43H53M13 47H18M46 47H51"/>
  `),
  '庄园': masonry(`
    <path fill="none" stroke="var(--district-gold)" d="M10 40V52M46 41H54M46 46H54M48 38V52M53 38V52"/>
    <path fill="var(--district-roof)" d="M10 28C4 31 5 39 10 41 15 39 17 31 10 28Z"/>
    <rect x="16" y="31" width="28" height="21"/>
    <path d="M35 18H40V27H35Z"/>
    <path fill="var(--district-roof)" d="M13 31 30 16 47 31Z"/>
    <rect x="27" y="42" width="7" height="10" fill="var(--district-ink)"/>
    <path fill="var(--district-ink)" d="M20 35H25V40H20ZM35 35H40V40H35Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M20 45H23M37 45H40"/>
  `),
  '城堡': masonry(`
    <path d="M12 25H23V52H12ZM42 25H53V52H42ZM25 19H39V52H25Z"/>
    <path fill="var(--district-roof)" d="M10 25 17.5 14 25 25ZM22 19 32 9 42 19ZM40 25 47.5 14 55 25Z"/>
    <path d="M23 52V35H27V32H31V35H35V32H39V35H42V52Z"/>
    <path fill="var(--district-ink)" d="M28 52V45A4 4 0 0 1 36 45V52ZM16 30H19V36H16ZM46 30H49V36H46ZM30 23H34V29H30Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M14 41H21M44 41H51"/>
  `),
  '宫殿': masonry(`
    <path d="M10 33H20V52H10ZM44 33H54V52H44ZM20 26H44V52H20Z"/>
    <path fill="var(--district-roof)" d="M8 33 15 25 22 33ZM42 33 49 25 56 33ZM17 26 32 13 47 26Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M32 9V13M23 29H41M23 33H41M12 36H18M46 36H52"/>
    <path fill="var(--district-ink)" d="M27 52V41A5 5 0 0 1 37 41V52Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M24 52V41A8 8 0 0 1 40 41V52"/>
    <path fill="var(--district-ink)" d="M13 41H17V46H13ZM47 41H51V46H47Z"/>
    <path fill="none" d="M32 42V52"/>
  `),
  '酒馆': masonry(`
    <path d="M23 27H52V52H23ZM44 15H48V24H44Z"/>
    <path fill="var(--district-roof)" d="M20 27 37 13 55 27Z"/>
    <path fill="none" stroke="var(--district-gold)" stroke-width="2.3" d="M14 20V16H26M19 17V22"/>
    <rect x="10" y="22" width="17" height="19" rx="2" fill="var(--district-roof)"/>
    <path d="M14 27H21V35H14ZM21 28H23A2.5 2.5 0 0 1 23 33H21"/>
    <path fill="none" stroke="var(--district-gold)" d="M15 25H20"/>
    <rect x="30" y="42" width="8" height="10" fill="var(--district-ink)"/>
    <rect x="43" y="34" width="5" height="6" fill="var(--district-ink)"/>
    <path fill="none" stroke="var(--district-gold)" d="M29 35H37"/>
  `),
  '商栈': masonry(`
    <rect x="14" y="25" width="36" height="27"/>
    <path fill="var(--district-roof)" d="M12 25 18 15H46L52 25Z"/>
    <path fill="var(--district-roof)" d="M12 27H52V33L48 35 44 33 40 35 36 33 32 35 28 33 24 35 20 33 16 35 12 33Z"/>
    <rect x="32" y="38" width="9" height="14" fill="var(--district-ink)"/>
    <rect x="44" y="39" width="4" height="7" fill="var(--district-ink)"/>
    <rect x="10" y="41" width="14" height="11" fill="var(--district-gold)"/>
    <rect x="17" y="34" width="11" height="10" fill="var(--district-gold)"/>
    <path fill="none" d="M11 42 23 51M23 42 11 51M18 35 27 43M27 35 18 43"/>
  `),
  '集市': masonry(`
    <path fill="var(--district-roof)" d="M8 31 32 12 56 31Z"/>
    <path d="M20 31 32 12 27 31ZM36 31 32 12 44 31Z"/>
    <path fill="var(--district-roof)" d="M9 31H55V35C52 39 49 39 46 35 43 39 39 39 36 35 33 39 30 39 27 35 24 39 20 39 17 35 14 39 11 39 9 35Z"/>
    <path fill="none" stroke="var(--district-gold)" stroke-width="2.8" d="M12 37V52M52 37V52"/>
    <rect x="16" y="44" width="32" height="8"/>
    <path fill="var(--district-roof)" d="M19 44V39H27V44ZM37 44V40H45V44Z"/>
    <circle cx="32" cy="42" r="2.5" fill="var(--district-gold)"/>
    <path fill="none" stroke="var(--district-gold)" d="M18 47H46"/>
  `),
  '船坞': masonry(`
    <rect x="18" y="22" width="28" height="18"/>
    <path fill="var(--district-roof)" d="M15 22 24 12H39L49 22Z"/>
    <rect x="23" y="28" width="8" height="12" fill="var(--district-ink)"/>
    <path fill="none" d="M21 25H43M34 26V31M41 26V31"/>
    <rect x="35" y="33" width="8" height="7" fill="var(--district-gold)"/>
    <path fill="none" d="M36 34 42 39M42 34 36 39"/>
    <rect x="9" y="40" width="42" height="6" fill="var(--district-gold)"/>
    <path fill="none" stroke="var(--district-gold)" stroke-width="3" d="M14 47V53M29 47V53M46 47V53"/>
    <path fill="none" d="M18 41V45M30 41V45M42 41V45"/>
    <path fill="var(--district-roof)" d="M36 48H54L50 52H41Z"/>
  `),
  '港口': masonry(`
    <path d="M46 21H54L53 51H45Z"/>
    <path fill="var(--district-roof)" d="M44 21 50 12 56 21Z"/>
    <rect x="48" y="24" width="4" height="5" fill="var(--district-gold)"/>
    <path fill="none" stroke="var(--district-roof)" stroke-width="4" d="M47 36H53"/>
    <path fill="none" stroke="var(--district-gold)" stroke-width="2.2" d="M30 12V44"/>
    <path d="M27 17 13 38H27Z"/>
    <path fill="var(--district-roof)" d="M33 19 42 35H33Z"/>
    <path fill="var(--district-gold)" d="M10 43H43L36 51H19Z"/>
    <path fill="none" d="M16 46H37"/>
    <path fill="none" stroke="var(--district-roof)" d="M10 54H24M29 54H42M47 54H55"/>
  `),
  '市政厅': masonry(`
    <path d="M15 34H27V52H15ZM39 34H51V52H39ZM27 19H39V52H27Z"/>
    <path fill="var(--district-roof)" d="M13 34 21 26 29 34ZM37 34 45 26 53 34ZM25 19 33 9 41 19Z"/>
    <circle cx="33" cy="27" r="4.5" stroke="var(--district-gold)"/>
    <path fill="none" d="M33 24V27L35 29"/>
    <rect x="30" y="43" width="6" height="9" fill="var(--district-ink)"/>
    <path fill="var(--district-ink)" d="M19 39H23V45H19ZM43 39H47V45H43Z"/>
    <path fill="none" stroke="var(--district-gold)" d="M29 35H37M17 49H25M41 49H49"/>
  `),
};
