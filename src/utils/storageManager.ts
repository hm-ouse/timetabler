import { FestivalData, UserRating, AttendanceStatus, FilterSettings, SheetParseResult } from '../types';
import { parseSheetContent } from './sheetParser';

export const STORAGE_KEYS = {
  RATINGS: 'festsync_custom_ratings',
  RAW_CSV: 'festsync_raw_csv',
  FESTIVAL: 'festsync_festival_data',
  STATUS_OVERRIDES: 'festsync_status_overrides',
  FILTER_SETTINGS: 'festsync_filter_settings',
  SIDEBAR_COLLAPSED: 'festsync_sidebar_collapsed',
  VERSION: 'festsync_storage_version',
} as const;

export const CURRENT_STORAGE_VERSION = '2.5.0';

export interface StorageDiagnostics {
  totalBytes: number;
  totalKeysCount: number;
  hasSavedFestival: boolean;
  savedFestivalName?: string;
  savedSetsCount: number;
  savedRatingsCount: number;
  savedStatusOverridesCount: number;
  hasRawCsv: boolean;
  isValid: boolean;
  errors: string[];
  lastValidatedAt: string;
}

/**
 * Validates a single UserRating object
 */
function isValidUserRating(item: any): item is UserRating {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.artist === 'string' &&
    item.artist.trim().length > 0 &&
    typeof item.normalizedScore === 'number' &&
    !isNaN(item.normalizedScore)
  );
}

/**
 * Validates a FestivalData object
 */
function isValidFestivalData(data: any): data is FestivalData {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.name !== 'string' || data.name.trim().length === 0) return false;
  if (!Array.isArray(data.days) || data.days.length === 0) return false;
  if (!Array.isArray(data.stages) || data.stages.length === 0) return false;
  if (!Array.isArray(data.sets)) return false;

  // Verify at least the structure of days
  const validDays = data.days.every((d: any) => d && typeof d.id === 'string' && typeof d.name === 'string');
  if (!validDays) return false;

  return true;
}

/**
 * Calculates current localStorage byte usage across all festsync keys
 */
export function calculateStorageBytes(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('festsync_')) {
        const val = localStorage.getItem(key) || '';
        total += (key.length + val.length) * 2; // UTF-16 approximate bytes
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Validates all localStorage keys on startup, removes stale or corrupted keys,
 * and repairs minor inconsistencies.
 */
export function validateAndCleanStorage(): {
  cleanedKeys: string[];
  errors: string[];
  repaired: boolean;
} {
  const cleanedKeys: string[] = [];
  const errors: string[] = [];
  let repaired = false;

  try {
    // 1. Validate Festival Data
    const festRaw = localStorage.getItem(STORAGE_KEYS.FESTIVAL);
    if (festRaw) {
      try {
        const parsed = JSON.parse(festRaw);
        if (!isValidFestivalData(parsed)) {
          errors.push('Found corrupted festival schedule schema. Removing invalid key.');
          localStorage.removeItem(STORAGE_KEYS.FESTIVAL);
          cleanedKeys.push(STORAGE_KEYS.FESTIVAL);
          repaired = true;
        }
      } catch (err) {
        errors.push('Failed to parse festival data JSON. Removing corrupted key.');
        localStorage.removeItem(STORAGE_KEYS.FESTIVAL);
        cleanedKeys.push(STORAGE_KEYS.FESTIVAL);
        repaired = true;
      }
    }

    // 2. Validate Ratings Data
    const ratingsRaw = localStorage.getItem(STORAGE_KEYS.RATINGS);
    if (ratingsRaw) {
      try {
        const parsed = JSON.parse(ratingsRaw);
        if (!Array.isArray(parsed)) {
          errors.push('Stored ratings is not an array. Removing invalid key.');
          localStorage.removeItem(STORAGE_KEYS.RATINGS);
          cleanedKeys.push(STORAGE_KEYS.RATINGS);
          repaired = true;
        } else {
          // Filter out any broken individual items
          const validRatings = parsed.filter(isValidUserRating);
          if (validRatings.length !== parsed.length) {
            errors.push(`Cleaned ${parsed.length - validRatings.length} malformed ratings entries.`);
            localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(validRatings));
            repaired = true;
          }
        }
      } catch (err) {
        errors.push('Failed to parse custom ratings JSON. Removing corrupted key.');
        localStorage.removeItem(STORAGE_KEYS.RATINGS);
        cleanedKeys.push(STORAGE_KEYS.RATINGS);
        repaired = true;
      }
    }

    // 3. Validate Attendance Status Overrides
    const statusRaw = localStorage.getItem(STORAGE_KEYS.STATUS_OVERRIDES);
    if (statusRaw) {
      try {
        const parsed = JSON.parse(statusRaw);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          errors.push('Status overrides is not a valid map. Removing invalid key.');
          localStorage.removeItem(STORAGE_KEYS.STATUS_OVERRIDES);
          cleanedKeys.push(STORAGE_KEYS.STATUS_OVERRIDES);
          repaired = true;
        } else {
          // Check values are valid statuses
          const validStatuses = new Set(['attending', 'maybe', 'skipped']);
          const cleanedMap: Record<string, AttendanceStatus> = {};
          let dirty = false;

          for (const [key, val] of Object.entries(parsed)) {
            if (typeof key === 'string' && typeof val === 'string' && validStatuses.has(val)) {
              cleanedMap[key] = val as AttendanceStatus;
            } else {
              dirty = true;
            }
          }

          if (dirty) {
            errors.push('Repaired invalid attendance status values.');
            localStorage.setItem(STORAGE_KEYS.STATUS_OVERRIDES, JSON.stringify(cleanedMap));
            repaired = true;
          }
        }
      } catch (err) {
        errors.push('Failed to parse status overrides JSON. Removing corrupted key.');
        localStorage.removeItem(STORAGE_KEYS.STATUS_OVERRIDES);
        cleanedKeys.push(STORAGE_KEYS.STATUS_OVERRIDES);
        repaired = true;
      }
    }

    // 4. Validate Filter Settings
    const filterRaw = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
    if (filterRaw) {
      try {
        const parsed = JSON.parse(filterRaw);
        if (typeof parsed !== 'object' || parsed === null) {
          localStorage.removeItem(STORAGE_KEYS.FILTER_SETTINGS);
          cleanedKeys.push(STORAGE_KEYS.FILTER_SETTINGS);
          repaired = true;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.FILTER_SETTINGS);
        cleanedKeys.push(STORAGE_KEYS.FILTER_SETTINGS);
        repaired = true;
      }
    }

    // 5. Clean any stale temporary festsync keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('festsync_temp_')) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
      cleanedKeys.push(k);
      repaired = true;
    }

    // Set storage schema version
    localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_STORAGE_VERSION);
  } catch (globalErr) {
    errors.push(`Storage verification encounter: ${String(globalErr)}`);
  }

  return { cleanedKeys, errors, repaired };
}

/**
 * Loads stored FestivalData from localStorage
 */
export function loadStoredFestival(): FestivalData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FESTIVAL);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isValidFestivalData(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load festival from localStorage', e);
  }
  return null;
}

/**
 * Persists FestivalData to localStorage
 */
export function saveStoredFestival(festival: FestivalData): boolean {
  try {
    if (!isValidFestivalData(festival)) return false;
    localStorage.setItem(STORAGE_KEYS.FESTIVAL, JSON.stringify(festival));
    return true;
  } catch (e) {
    console.error('Failed to save festival to localStorage', e);
    return false;
  }
}

/**
 * Loads stored Ratings from localStorage
 */
export function loadStoredRatings(): {
  ratings: UserRating[];
  rawCsv: string;
  meta?: SheetParseResult;
} | null {
  try {
    const rawRatings = localStorage.getItem(STORAGE_KEYS.RATINGS);
    const rawCsv = localStorage.getItem(STORAGE_KEYS.RAW_CSV) || '';

    if (rawRatings) {
      const parsed = JSON.parse(rawRatings);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(isValidUserRating);
        if (valid.length > 0) {
          let meta: SheetParseResult | undefined;
          if (rawCsv.trim().length > 0) {
            try {
              meta = parseSheetContent(rawCsv, 'auto');
            } catch {
              // fallback gracefully
            }
          }
          return { ratings: valid, rawCsv, meta };
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load ratings from localStorage', e);
  }
  return null;
}

/**
 * Persists UserRatings and optional raw CSV text to localStorage
 */
export function saveStoredRatings(ratings: UserRating[], rawCsv?: string): boolean {
  try {
    const valid = ratings.filter(isValidUserRating);
    localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(valid));
    if (typeof rawCsv === 'string') {
      localStorage.setItem(STORAGE_KEYS.RAW_CSV, rawCsv);
    }
    return true;
  } catch (e) {
    console.error('Failed to save ratings to localStorage', e);
    return false;
  }
}

/**
 * Loads attendance status overrides
 */
export function loadStoredStatusOverrides(): Record<string, AttendanceStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATUS_OVERRIDES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load status overrides', e);
  }
  return {};
}

/**
 * Persists attendance status overrides
 */
export function saveStoredStatusOverrides(overrides: Record<string, AttendanceStatus>): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.STATUS_OVERRIDES, JSON.stringify(overrides));
    return true;
  } catch (e) {
    console.error('Failed to save status overrides', e);
    return false;
  }
}

/**
 * Loads stored filter settings
 */
export function loadStoredFilterSettings(): Partial<FilterSettings> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load filter settings', e);
  }
  return null;
}

/**
 * Persists filter settings
 */
export function saveStoredFilterSettings(settings: FilterSettings): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.FILTER_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Failed to save filter settings', e);
    return false;
  }
}

/**
 * Loads stored sidebar state
 */
export function loadStoredSidebarState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists sidebar state
 */
export function saveStoredSidebarState(collapsed: boolean): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(collapsed));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all FestSync data from localStorage completely
 */
export function resetAllStorageData(): void {
  try {
    const keysToRemove = Object.values(STORAGE_KEYS);
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
    // Also remove any other festsync_ prefixed keys
    const extraKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('festsync_')) {
        extraKeys.push(k);
      }
    }
    for (const k of extraKeys) {
      localStorage.removeItem(k);
    }
    localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_STORAGE_VERSION);
  } catch (e) {
    console.error('Failed to clear storage data', e);
  }
}

/**
 * Returns comprehensive storage diagnostics
 */
export function getStorageDiagnostics(): StorageDiagnostics {
  const errors: string[] = [];
  let savedFestivalName: string | undefined;
  let savedSetsCount = 0;
  let savedRatingsCount = 0;
  let savedStatusOverridesCount = 0;
  let hasSavedFestival = false;
  let hasRawCsv = false;
  let totalKeysCount = 0;

  try {
    const festRaw = localStorage.getItem(STORAGE_KEYS.FESTIVAL);
    if (festRaw) {
      try {
        const parsed = JSON.parse(festRaw);
        if (isValidFestivalData(parsed)) {
          hasSavedFestival = true;
          savedFestivalName = parsed.name;
          savedSetsCount = parsed.sets.length;
        } else {
          errors.push('Festival data schema is invalid');
        }
      } catch {
        errors.push('Festival data contains invalid JSON');
      }
    }

    const ratingsRaw = localStorage.getItem(STORAGE_KEYS.RATINGS);
    if (ratingsRaw) {
      try {
        const parsed = JSON.parse(ratingsRaw);
        if (Array.isArray(parsed)) {
          savedRatingsCount = parsed.length;
        } else {
          errors.push('Ratings data is not an array');
        }
      } catch {
        errors.push('Ratings data contains invalid JSON');
      }
    }

    const statusRaw = localStorage.getItem(STORAGE_KEYS.STATUS_OVERRIDES);
    if (statusRaw) {
      try {
        const parsed = JSON.parse(statusRaw);
        if (typeof parsed === 'object' && parsed !== null) {
          savedStatusOverridesCount = Object.keys(parsed).length;
        }
      } catch {
        errors.push('Status overrides contains invalid JSON');
      }
    }

    const rawCsv = localStorage.getItem(STORAGE_KEYS.RAW_CSV);
    if (rawCsv && rawCsv.trim().length > 0) {
      hasRawCsv = true;
    }

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('festsync_')) {
        totalKeysCount++;
      }
    }
  } catch (e) {
    errors.push(`Diagnostics error: ${String(e)}`);
  }

  return {
    totalBytes: calculateStorageBytes(),
    totalKeysCount,
    hasSavedFestival,
    savedFestivalName,
    savedSetsCount,
    savedRatingsCount,
    savedStatusOverridesCount,
    hasRawCsv,
    isValid: errors.length === 0,
    errors,
    lastValidatedAt: new Date().toLocaleTimeString(),
  };
}

/**
 * Exports all user data as a standalone JSON payload
 */
export function exportAllDataJson(): string {
  const fest = loadStoredFestival();
  const ratingsData = loadStoredRatings();
  const statusOverrides = loadStoredStatusOverrides();
  const filterSettings = loadStoredFilterSettings();

  const payload = {
    app: 'timetabler',
    version: CURRENT_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    festival: fest,
    ratings: ratingsData?.ratings || [],
    rawCsv: ratingsData?.rawCsv || '',
    statusOverrides,
    filterSettings,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Imports a JSON backup payload and validates it before saving
 */
export function importAllDataJson(jsonString: string): {
  success: boolean;
  error?: string;
  festival?: FestivalData;
  ratings?: UserRating[];
  rawCsv?: string;
  statusOverrides?: Record<string, AttendanceStatus>;
} {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid JSON payload structure.' };
    }

    let festival: FestivalData | undefined;
    if (data.festival && isValidFestivalData(data.festival)) {
      festival = data.festival;
      saveStoredFestival(festival);
    }

    let ratings: UserRating[] | undefined;
    let rawCsv: string | undefined = typeof data.rawCsv === 'string' ? data.rawCsv : undefined;

    if (Array.isArray(data.ratings)) {
      ratings = data.ratings.filter(isValidUserRating);
      saveStoredRatings(ratings, rawCsv);
    }

    let statusOverrides: Record<string, AttendanceStatus> | undefined;
    if (data.statusOverrides && typeof data.statusOverrides === 'object') {
      statusOverrides = data.statusOverrides;
      saveStoredStatusOverrides(statusOverrides);
    }

    if (data.filterSettings && typeof data.filterSettings === 'object') {
      saveStoredFilterSettings(data.filterSettings);
    }

    return {
      success: true,
      festival,
      ratings,
      rawCsv,
      statusOverrides,
    };
  } catch (e) {
    return { success: false, error: `Import failed: ${String(e)}` };
  }
}
