import type { District } from './game';

const districtTypes: Record<string, string> = {
  blue: '宗教地区',
  red: '军事地区',
  yellow: '贵族地区',
  green: '商业地区',
  purple: '特别地区',
};

const ordinaryDescriptions: Record<string, string> = {
  blue: '主教领取宗教地区收入时，这座建筑提供 1 枚金币。',
  red: '领主领取军事地区收入时，这座建筑提供 1 枚金币。',
  yellow: '国王领取贵族地区收入时，这座建筑提供 1 枚金币。',
  green: '商人领取商业地区收入时，这座建筑提供 1 枚金币。',
};

// Special district text follows docs/富饶之城规则.pdf, pages 5–6.
const specialDescriptions: Record<string, string> = {
  library: '执行抽牌行动时，可以保留抽到的两张地区卡。',
  'dragon-gate': '游戏结束时按 8 分计算。',
  graveyard: '领主摧毁一座地区后，你可以支付 1 枚金币，将被摧毁的地区卡加入手牌。你本轮是领主时，不能使用此能力。',
  'ghost-city': '终局计分时，可视为任意一种颜色的建筑。若在游戏最后一轮建成，则不能使用此能力。',
  'magic-school': '计算角色的地区金币收入时，可视为任意一种颜色。国王、主教、商人或领主领取地区收入时，均可由此获得 1 枚金币。',
  laboratory: '每回合一次，可以弃掉 1 张手牌，获得 1 枚金币。',
  smithy: '每回合一次，可以支付 3 枚金币，抽取 2 张地区卡。',
  observatory: '执行抽牌行动时，可以抽取 3 张地区卡，保留 1 张，将其余两张放到牌库底部。',
  university: '游戏结束时按 8 分计算。',
  citadel: '不能被领主摧毁。',
  'great-wall': '领主摧毁你城区内的其他建筑时，须额外支付 1 枚金币。摧毁长城本身不加价。',
};

const specialAbilitiesByName: Record<string, string> = {
  图书馆: 'library',
  巨龙门: 'dragon-gate',
  墓地: 'graveyard',
  鬼城: 'ghost-city',
  魔法学院: 'magic-school',
  实验室: 'laboratory',
  铁匠铺: 'smithy',
  天文台: 'observatory',
  大学: 'university',
  堡垒: 'citadel',
  长城: 'great-wall',
};

export function districtType(color: string): string {
  return districtTypes[color] ?? '地区';
}

export function districtDescription(district: District): string {
  if (district.color !== 'purple') return ordinaryDescriptions[district.color] ?? '';
  const ability = district.ability ?? specialAbilitiesByName[district.name] ?? '';
  return specialDescriptions[ability] ?? '拥有卡面所示的特殊能力。';
}
