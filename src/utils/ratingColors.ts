export interface RatingColorMeta {
  minScore: number;
  label: string;
  shortLabel: string;
  tierName: string;
  bgClass: string;
  borderClass: string;
  borderLeftClass: string;
  textClass: string;
  badgeClass: string;
  solidHex: string;
  glowClass: string;
  isUnrated?: boolean;
}

export const UNRATED_COLOR_META: RatingColorMeta = {
  minScore: -1,
  label: 'Unrated / Not Reviewed',
  shortLabel: 'Unrated',
  tierName: 'Unrated',
  bgClass: 'bg-[#1a1725]/70 hover:bg-[#221e30]/80',
  borderClass: 'border-[#37324d]/70 border-dashed',
  borderLeftClass: 'border-l-4 border-l-[#7c768e]',
  textClass: 'text-[#b5b0c4]',
  badgeClass: 'bg-[#252134] text-[#b5b0c4] border border-[#3c3754] font-medium',
  solidHex: '#8e88a3',
  glowClass: '',
  isUnrated: true,
};

export const RATING_SCALE_TIERS: RatingColorMeta[] = [
  {
    minScore: 90,
    label: '90–100% (Must See / 10/10)',
    shortLabel: '90%+',
    tierName: 'Must See',
    bgClass: 'bg-[#06241a]/60 hover:bg-[#06241a]/80',
    borderClass: 'border-emerald-500/40',
    borderLeftClass: 'border-l-4 border-l-emerald-400',
    textClass: 'text-emerald-300',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-bold',
    solidHex: '#10b981',
    glowClass: 'shadow-[0_0_14px_rgba(16,185,129,0.18)]',
  },
  {
    minScore: 80,
    label: '80–89% (High Priority / 4★)',
    shortLabel: '80%+',
    tierName: 'High',
    bgClass: 'bg-[#082624]/60 hover:bg-[#082624]/80',
    borderClass: 'border-teal-500/40',
    borderLeftClass: 'border-l-4 border-l-teal-400',
    textClass: 'text-teal-300',
    badgeClass: 'bg-teal-500/20 text-teal-300 border border-teal-500/35 font-bold',
    solidHex: '#14b8a6',
    glowClass: 'shadow-[0_0_14px_rgba(20,184,166,0.18)]',
  },
  {
    minScore: 70,
    label: '70–79% (Recommended / 7/10)',
    shortLabel: '70%+',
    tierName: 'Recommended',
    bgClass: 'bg-[#161a35]/60 hover:bg-[#161a35]/80',
    borderClass: 'border-indigo-500/40',
    borderLeftClass: 'border-l-4 border-l-indigo-400',
    textClass: 'text-indigo-300',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 font-bold',
    solidHex: '#6366f1',
    glowClass: 'shadow-[0_0_14px_rgba(99,102,241,0.18)]',
  },
  {
    minScore: 60,
    label: '60–69% (Solid Match / 3★)',
    shortLabel: '60%+',
    tierName: 'Solid',
    bgClass: 'bg-[#221633]/60 hover:bg-[#221633]/80',
    borderClass: 'border-purple-500/40',
    borderLeftClass: 'border-l-4 border-l-purple-400',
    textClass: 'text-purple-300',
    badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/35 font-medium',
    solidHex: '#a855f7',
    glowClass: 'shadow-[0_0_14px_rgba(168,85,247,0.16)]',
  },
  {
    minScore: 50,
    label: '50–59% (Interested / 5/10)',
    shortLabel: '50%+',
    tierName: 'Medium',
    bgClass: 'bg-[#2a1e12]/60 hover:bg-[#2a1e12]/80',
    borderClass: 'border-amber-500/40',
    borderLeftClass: 'border-l-4 border-l-amber-400',
    textClass: 'text-amber-300',
    badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/35 font-medium',
    solidHex: '#f59e0b',
    glowClass: 'shadow-[0_0_14px_rgba(245,158,11,0.16)]',
  },
  {
    minScore: 35,
    label: '35–49% (Curious / Low)',
    shortLabel: '35%+',
    tierName: 'Low',
    bgClass: 'bg-[#281512]/50 hover:bg-[#281512]/70',
    borderClass: 'border-orange-500/35',
    borderLeftClass: 'border-l-4 border-l-orange-400',
    textClass: 'text-orange-300',
    badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/30 font-normal',
    solidHex: '#f97316',
    glowClass: '',
  },
  {
    minScore: 0,
    label: '< 35% (Pass / Low Score)',
    shortLabel: '<35%',
    tierName: 'Pass',
    bgClass: 'bg-[#15131c]/70 hover:bg-[#1c1926]/80',
    borderClass: 'border-[#2d283e]',
    borderLeftClass: 'border-l-4 border-l-[#4b4462]',
    textClass: 'text-[#7c768e]',
    badgeClass: 'bg-[#1e1b29] text-[#7c768e] border border-[#2d283e] font-normal',
    solidHex: '#645d7a',
    glowClass: '',
  },
];

export function getRatingColorMeta(score: number | null | undefined, isRated: boolean = true): RatingColorMeta {
  if (!isRated || score === null || score === undefined) {
    return UNRATED_COLOR_META;
  }
  for (const tier of RATING_SCALE_TIERS) {
    if (score >= tier.minScore) {
      return tier;
    }
  }
  return RATING_SCALE_TIERS[RATING_SCALE_TIERS.length - 1];
}

/**
 * Returns a CSS hex color interpolated for smooth continuous scales
 */
export function getScoreHexColor(score: number | null | undefined, isRated: boolean = true): string {
  const meta = getRatingColorMeta(score, isRated);
  return meta.solidHex;
}
