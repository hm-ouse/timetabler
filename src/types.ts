export type RatingScaleType =
  | 'auto'
  | 'scale_4'
  | 'scale_5'
  | 'scale_10'
  | 'scale_100'
  | 'percentage'
  | 'custom';

export interface UserRating {
  id: string;
  artist: string;
  rawScore?: number | string | null;
  normalizedScore: number; // 0 to 100 percentage (0 if unrated)
  isRated?: boolean; // true if a valid numeric rating exists
  isReviewed?: boolean; // true if text notes/review exist
  detectedScale: string; // e.g. "Scale 1-10", "Scale 1-5", "Scale 1-4"
  reviewSummary: string;
  genre?: string;
  notes?: string;
  isSelected?: boolean;
}

export interface SheetTabInfo {
  id: string;
  name: string;
  gid?: string;
  isDefault?: boolean;
  rowCount?: number;
  csvContent?: string;
}

export interface SheetParseResult {
  ratings: UserRating[];
  detectedScale: string;
  detectedMax: number;
  totalRows: number;
  validRatingsCount: number;
  artistColumn: string;
  scoreColumn: string;
  reviewColumn: string;
  genreColumn?: string;
  rawHeaders: string[];
  activeTabName?: string;
  activeTabGid?: string;
  availableTabs?: SheetTabInfo[];
  sourceUrl?: string;
  sourceType?: 'google_sheet' | 'paste' | 'upload' | 'sample';
}

export interface FestivalDay {
  id: string;
  name: string;
  date?: string; // YYYY-MM-DD or readable string
}

export interface FestivalSet {
  id: string;
  artist: string;
  stage: string;
  dayId: string;
  dayName: string;
  startTime: string; // HH:MM in 24h
  endTime: string; // HH:MM in 24h
  fullStartIso?: string;
  fullEndIso?: string;
  description?: string;
  originalNotes?: string;
}

export interface FestivalData {
  name: string;
  location?: string;
  year?: string;
  days: FestivalDay[];
  stages: string[];
  sets: FestivalSet[];
  sourceUrl?: string;
  sourceType?: 'clashfinder' | 'web_scrape' | 'upload' | 'preset' | 'ai_text';
}

export type ScoreTier = 'must_see' | 'recommended' | 'medium' | 'low' | 'unrated';
export type AttendanceStatus = 'attending' | 'maybe' | 'skipped';

export interface MatchedScheduleItem {
  id: string;
  set: FestivalSet;
  rating?: UserRating;
  normalizedScore: number; // from rating or 0
  isRated: boolean; // whether numeric score was provided
  isReviewed: boolean; // whether review/notes text was provided
  tier: ScoreTier;
  status: AttendanceStatus;
  hasClash: boolean;
  clashingSetIds: string[];
  isElapsed: boolean;
  isCurrentlyPlaying: boolean;
  matchScore: number; // 0 to 1 confidence
}

export interface FilterSettings {
  minScorePercent: number; // default 60%
  showUnrated: boolean; // whether to keep unrated/unreviewed acts visible on timetable
  scoreTiers?: ScoreTier[];
  searchQuery: string;
  selectedStages?: string[];
  selectedDays?: string[];
  selectedTiers?: ScoreTier[];
  showElapsed: boolean;
  dimPastSets: boolean;
  onlyAttendingOrMaybe: boolean;
  activeView?: 'grid' | 'list' | 'clashes' | 'ratings';
  viewMode?: 'timetable_grid' | 'timeline_list' | 'clash_inspector' | 'ratings_sheet';
  timeDensity: 'compact' | 'standard' | 'spacious';
}

export interface TimeSimulation {
  enabled: boolean;
  simulatedTime: string; // HH:MM format
  simulatedDayId: string;
}
