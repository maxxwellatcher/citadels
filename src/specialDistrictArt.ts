// Static SVG fragments. Each special district keeps its own recognizable silhouette.
// Shared colors come from the surrounding district emblem; no SVG IDs are needed.
export const SPECIAL_DISTRICT_ART: Record<string, string> = {
  '图书馆': `<g fill="var(--district-stone)" stroke="var(--district-gold)" stroke-width="1.8">
    <path d="M14 29H50V52H14Z"/>
    <path fill="var(--district-roof)" d="M11 29 32 13 53 29Z"/>
    <path fill="var(--district-ink)" d="M19 34H24V43H19ZM40 34H45V43H40Z"/>
    <path d="M17 45Q25 41 32 46Q39 41 47 45V54Q39 50 32 54Q25 50 17 54Z"/>
    <path fill="none" stroke="var(--district-roof)" d="M32 46V53M21 47 28 48M36 48 43 47"/>
  </g>`,
  '巨龙门': `<g stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-roof)" d="M27 24 15 12 12 29 21 26 17 35 28 31ZM37 24 49 12 52 29 43 26 47 35 36 31Z"/>
    <path fill="var(--district-stone)" d="M19 27H45V53H37V39A5 5 0 0 0 27 39V53H19Z"/>
    <path fill="var(--district-roof)" d="M26 25 25 17 32 12 39 17 38 25 32 29Z"/>
    <path fill="var(--district-ink)" d="M28 19 31 20M36 19 33 20"/>
    <path fill="none" d="M30 24H34M22 34H25M39 34H42M22 44H25M39 44H42"/>
  </g>`,
  '墓地': `<g fill="var(--district-stone)" stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-roof)" d="M13 32A6 6 0 0 1 25 32V47H13ZM41 32A5 5 0 0 1 51 32V47H41Z"/>
    <path d="M23 27A10 10 0 0 1 43 27V49H23Z"/>
    <path fill="none" stroke="var(--district-roof)" stroke-width="3" d="M33 26V39M28 31H38"/>
    <path fill="var(--district-roof)" d="M19 49H47V54H19Z"/>
    <path fill="none" d="M12 53 15 49M50 52 53 47M17 39H21M45 38H48"/>
  </g>`,
  '鬼城': `<g stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-stone)" d="M48 11A10 10 0 0 0 53 28 11 11 0 1 1 48 11Z"/>
    <path fill="var(--district-stone)" d="M13 52V30L21 22 25 30V39L32 35 38 41V26L45 21 51 29V52Z"/>
    <path fill="var(--district-roof)" d="M10 31 21 18 27 31 22 28 18 32ZM35 27 44 17 53 29 46 27 42 30Z"/>
    <path fill="var(--district-ink)" d="M17 35H22V43H17ZM42 33H47V42H42ZM27 52V46A5 5 0 0 1 37 46V52"/>
    <path fill="none" stroke="var(--district-roof)" d="M25 35 29 39 26 43M39 46 42 50"/>
  </g>`,
  '魔法学院': `<g stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-stone)" d="M22 29H42V53H22ZM12 43H22V53H12ZM42 43H52V53H42Z"/>
    <path fill="var(--district-roof)" d="M18 29 32 10 46 29ZM10 43 17 34 24 43ZM40 43 47 34 54 43Z"/>
    <path fill="var(--district-ink)" d="M28 53V44A4 4 0 0 1 36 44V53ZM29 32H35V38H29Z"/>
    <path fill="var(--district-stone)" d="M47 10 49 15 54 17 49 19 47 24 45 19 40 17 45 15Z"/>
    <path fill="none" d="M14 16V22M11 19H17"/>
  </g>`,
  '实验室': `<g stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-stone)" d="M13 32H50V53H13Z"/>
    <path fill="var(--district-roof)" d="M10 32 28 18 47 32ZM42 14H48V30H42Z"/>
    <path fill="var(--district-stone)" d="M29 23H39V27H37V36L45 48Q47 53 42 54H26Q21 53 23 48L31 36V27H29Z"/>
    <path fill="var(--district-roof)" d="M26 45Q30 42 34 45Q38 48 42 45L45 50Q46 53 42 53H26Q22 53 24 50Z"/>
    <circle fill="var(--district-stone)" cx="33" cy="48" r="1.8"/>
    <path fill="var(--district-ink)" d="M17 37H23V43H17Z"/>
    <path fill="none" d="M42 11 45 9M48 9 51 11"/>
  </g>`,
  '铁匠铺': `<g stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-stone)" d="M13 31H49V53H13Z"/>
    <path fill="var(--district-roof)" d="M10 31 27 18 51 31ZM41 13H48V29H41Z"/>
    <path fill="var(--district-ink)" d="M17 53V42A6 6 0 0 1 29 42V53Z"/>
    <path fill="var(--district-roof)" d="M27 39H49L45 44H39V49H43V53H28V49H33V44L27 42 23 40Z"/>
    <path fill="none" stroke="var(--district-stone)" stroke-width="3" d="M35 29 42 37"/>
    <path fill="var(--district-stone)" d="M29 28 34 23 40 29 35 34Z"/>
    <path fill="none" d="M20 45 22 41 24 46"/>
  </g>`,
  '天文台': `<g stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-stone)" d="M15 32H49V53H15Z"/>
    <path fill="var(--district-roof)" d="M12 32A20 20 0 0 1 52 32Z"/>
    <path fill="none" d="M32 13Q21 22 23 31M32 13Q39 19 41 27"/>
    <path fill="var(--district-stone)" d="M31 25 47 15 51 21 35 31Z"/>
    <path fill="var(--district-roof)" d="M47 14 51 12 54 19 51 22Z"/>
    <path fill="var(--district-ink)" d="M28 53V44A4 4 0 0 1 36 44V53ZM19 37H23V42H19ZM41 37H45V42H41Z"/>
    <path fill="none" d="M13 11V17M10 14H16"/>
  </g>`,
  '大学': `<g fill="var(--district-stone)" stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-roof)" d="M10 27 32 13 54 27Z"/>
    <path d="M13 28H51V33H13ZM15 33H21V49H15ZM29 33H35V49H29ZM43 33H49V49H43ZM12 49H52V54H12Z"/>
    <path fill="var(--district-roof)" d="M24 21Q28 19 32 22Q36 19 40 21V28Q36 26 32 28Q28 26 24 28Z"/>
    <path fill="none" d="M32 22V27"/>
    <path fill="none" stroke="var(--district-roof)" d="M18 36V46M32 36V46M46 36V46"/>
  </g>`,
  '堡垒': `<g stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-stone)" d="M12 18H19V25H25V18H39V25H45V18H52V52H12Z"/>
    <path fill="var(--district-roof)" d="M12 27H52V33H12Z"/>
    <path fill="var(--district-ink)" d="M17 37H22V44H17ZM42 37H47V44H42Z"/>
    <path fill="var(--district-roof)" d="M23 35 32 31 41 35 40 45Q38 51 32 54Q26 51 24 45Z"/>
    <path fill="none" stroke="var(--district-stone)" stroke-width="2.5" d="M32 37V48M28 42H36"/>
    <path fill="none" d="M13 47H21M43 47H51"/>
  </g>`,
  '长城': `<g stroke="var(--district-gold)" stroke-width="1.8">
    <path fill="var(--district-stone)" d="M12 32H19V37H25V31H32V36H38V30H45V35H52V51L12 54Z"/>
    <path fill="var(--district-stone)" d="M12 21H25V53H12ZM40 17H53V51H40Z"/>
    <path fill="var(--district-roof)" d="M10 21 18 13 27 21ZM38 17 46 9 54 17Z"/>
    <path fill="var(--district-ink)" d="M17 26H21V34H17ZM45 23H49V31H45Z"/>
    <path fill="none" stroke="var(--district-roof)" d="M13 41H24M14 47H24M27 43 38 42M32 43V48M41 37H52M41 44H52M17 42V46M46 38V43"/>
  </g>`,
};
