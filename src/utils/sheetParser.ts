import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UserRating, SheetParseResult, RatingScaleType, SheetTabInfo } from '../types';

/**
 * Parses an Excel or OpenDocument binary file (.xlsx, .xls, .ods) and extracts all worksheets / tabs
 */
export function parseExcelWorkbook(data: ArrayBuffer | Uint8Array): {
  sheetNames: string[];
  tabs: SheetTabInfo[];
  sheetsCsv: Record<string, string>;
} {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];
  const sheetsCsv: Record<string, string> = {};
  const tabs: SheetTabInfo[] = [];

  sheetNames.forEach((name, idx) => {
    const ws = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(ws);
    sheetsCsv[name] = csv;
    tabs.push({
      id: `tab-${idx}`,
      name,
      gid: String(idx),
      isDefault: idx === 0,
      csvContent: csv,
    });
  });

  return {
    sheetNames,
    tabs,
    sheetsCsv,
  };
}

/**
 * Normalizes an artist name for comparison and display
 */
export function normalizeArtistName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/[^\w\s&]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts numeric score from raw cell content
 * Examples:
 * - "8.5" -> 8.5
 * - "4/5" -> 4 (and scale 5)
 * - "9/10" -> 9 (and scale 10)
 * - "95%" -> 95
 * - "3.5 out of 4" -> 3.5
 * - "4 stars" -> 4
 */
export function extractScoreAndExplicitScale(value: any): { score: number; scale?: number } | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Check for fractional pattern e.g. "8.5/10", "4 / 5", "3/4"
  const fractionMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const denom = parseFloat(fractionMatch[2]);
    if (!isNaN(num) && !isNaN(denom) && denom > 0) {
      return { score: num, scale: denom };
    }
  }

  // Check for percentage e.g. "85%"
  const percentMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  if (percentMatch) {
    const num = parseFloat(percentMatch[1]);
    if (!isNaN(num)) {
      return { score: num, scale: 100 };
    }
  }

  // Check for "X out of Y"
  const outOfMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*out of\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (outOfMatch) {
    const num = parseFloat(outOfMatch[1]);
    const denom = parseFloat(outOfMatch[2]);
    if (!isNaN(num) && !isNaN(denom) && denom > 0) {
      return { score: num, scale: denom };
    }
  }

  // Pure number or floating point with extra text
  const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (!isNaN(cleanNum)) {
    return { score: cleanNum };
  }

  return null;
}

/**
 * Auto-detects rating scale from headers, explicit values, and numeric distribution
 */
export function detectRatingScale(
  scores: number[],
  explicitScales: number[],
  headerName: string = '',
  manualScaleOverride?: RatingScaleType
): { scale: number; description: string } {
  if (manualScaleOverride && manualScaleOverride !== 'auto') {
    switch (manualScaleOverride) {
      case 'scale_4':
        return { scale: 4, description: 'Scale 1-4' };
      case 'scale_5':
        return { scale: 5, description: 'Scale 1-5' };
      case 'scale_10':
        return { scale: 10, description: 'Scale 1-10' };
      case 'scale_100':
      case 'percentage':
        return { scale: 100, description: 'Scale 0-100%' };
      default:
        break;
    }
  }

  // 1. Check if header specifies scale
  const lowerHeader = headerName.toLowerCase();
  if (lowerHeader.includes('/4') || lowerHeader.includes('out of 4') || lowerHeader.includes('1-4')) {
    return { scale: 4, description: 'Scale 1-4 (from header)' };
  }
  if (lowerHeader.includes('/5') || lowerHeader.includes('out of 5') || lowerHeader.includes('1-5') || lowerHeader.includes('stars')) {
    return { scale: 5, description: 'Scale 1-5 (from header)' };
  }
  if (lowerHeader.includes('/10') || lowerHeader.includes('out of 10') || lowerHeader.includes('1-10')) {
    return { scale: 10, description: 'Scale 1-10 (from header)' };
  }
  if (lowerHeader.includes('/100') || lowerHeader.includes('%') || lowerHeader.includes('percent')) {
    return { scale: 100, description: 'Scale 0-100% (from header)' };
  }

  // 2. Check explicit scales extracted from cell values (e.g. "4/5")
  if (explicitScales.length > 0) {
    const scaleFrequency: Record<number, number> = {};
    explicitScales.forEach((s) => {
      scaleFrequency[s] = (scaleFrequency[s] || 0) + 1;
    });
    const mostFrequentScale = Object.entries(scaleFrequency).sort((a, b) => b[1] - a[1])[0];
    if (mostFrequentScale) {
      const detected = parseFloat(mostFrequentScale[0]);
      return { scale: detected, description: `Scale 1-${detected} (detected from cell fractions)` };
    }
  }

  if (scores.length === 0) {
    return { scale: 10, description: 'Scale 1-10 (default)' };
  }

  const maxVal = Math.max(...scores);

  // 3. Distribution inspection
  if (maxVal <= 4) {
    return { scale: 4, description: 'Scale 1-4 (max score ' + maxVal + ')' };
  }
  if (maxVal <= 5) {
    return { scale: 5, description: 'Scale 1-5 (max score ' + maxVal + ')' };
  }
  if (maxVal <= 10) {
    return { scale: 10, description: 'Scale 1-10 (max score ' + maxVal + ')' };
  }
  if (maxVal <= 100) {
    return { scale: 100, description: 'Scale 0-100% (max score ' + maxVal + ')' };
  }

  return { scale: maxVal, description: `Custom Scale (max score ${maxVal})` };
}

/**
 * Normalizes score to 0 - 100%
 */
export function normalizeScore(score: number, scale: number): number {
  if (isNaN(score) || scale <= 0) return 0;
  const percent = (score / scale) * 100;
  return Math.min(100, Math.max(0, Math.round(percent * 10) / 10));
}

/**
 * Main parser for CSV, Google Sheets, or pasted table text
 */
export function parseSheetContent(
  rawText: string,
  scaleOverride: RatingScaleType = 'auto',
  tabMeta?: {
    activeTabName?: string;
    activeTabGid?: string;
    availableTabs?: SheetTabInfo[];
    sourceUrl?: string;
    sourceType?: 'google_sheet' | 'paste' | 'upload' | 'sample';
  }
): SheetParseResult {
  const cleanInput = rawText.trim();
  if (!cleanInput) {
    return {
      ratings: [],
      detectedScale: 'None',
      detectedMax: 10,
      totalRows: 0,
      validRatingsCount: 0,
      artistColumn: '',
      scoreColumn: '',
      reviewColumn: '',
      rawHeaders: [],
      activeTabName: tabMeta?.activeTabName,
      activeTabGid: tabMeta?.activeTabGid,
      availableTabs: tabMeta?.availableTabs,
      sourceUrl: tabMeta?.sourceUrl,
      sourceType: tabMeta?.sourceType,
    };
  }

  // Detect if content is an HTML webpage (e.g. Google Sign-In, error page, or website)
  const isHtml =
    cleanInput.toLowerCase().startsWith('<!doctype') ||
    cleanInput.toLowerCase().startsWith('<html') ||
    (cleanInput.startsWith('<') && cleanInput.toLowerCase().includes('</html>'));

  if (isHtml) {
    const isGoogleLogin =
      cleanInput.includes('accounts.google.com') ||
      cleanInput.includes('ServiceLogin') ||
      cleanInput.includes('Sign in') ||
      cleanInput.includes('Access Denied');

    const warningMsg = isGoogleLogin
      ? 'The Google Sheet appears to be private or requires Google login. In Google Sheets, click "Share" (top-right) and set access to "Anyone with the link can view", or copy the spreadsheet cells and paste them into the "Paste Sheet" tab.'
      : 'The content is an HTML web page rather than spreadsheet data. Please copy the table cells directly or ensure the Google Sheet is shared with "Anyone with the link can view".';

    return {
      ratings: [],
      detectedScale: 'None',
      detectedMax: 10,
      totalRows: 0,
      validRatingsCount: 0,
      artistColumn: '',
      scoreColumn: '',
      reviewColumn: '',
      rawHeaders: [],
      activeTabName: tabMeta?.activeTabName,
      activeTabGid: tabMeta?.activeTabGid,
      availableTabs: tabMeta?.availableTabs,
      sourceUrl: tabMeta?.sourceUrl,
      sourceType: tabMeta?.sourceType,
      warning: warningMsg,
      error: warningMsg,
    };
  }

  // Parse with PapaParse
  const parsed = Papa.parse<any[]>(cleanInput, {
    header: false,
    skipEmptyLines: true,
  });

  if (!parsed.data || parsed.data.length === 0) {
    return {
      ratings: [],
      detectedScale: 'None',
      detectedMax: 10,
      totalRows: 0,
      validRatingsCount: 0,
      artistColumn: '',
      scoreColumn: '',
      reviewColumn: '',
      rawHeaders: [],
      activeTabName: tabMeta?.activeTabName,
      activeTabGid: tabMeta?.activeTabGid,
      availableTabs: tabMeta?.availableTabs,
      sourceUrl: tabMeta?.sourceUrl,
      sourceType: tabMeta?.sourceType,
    };
  }

  const rows = parsed.data;
  let headerRowIndex = 0;
  let headers: string[] = [];

  // Check if row 0 looks like a header
  const row0 = rows[0].map((c: any) => String(c || '').trim());
  const hasHeaderKeywords = row0.some((col: string) => {
    const l = col.toLowerCase();
    return (
      l.includes('artist') ||
      l.includes('band') ||
      l.includes('act') ||
      l.includes('name') ||
      l.includes('rating') ||
      l.includes('score') ||
      l.includes('review') ||
      l.includes('summary') ||
      l.includes('notes')
    );
  });

  if (hasHeaderKeywords) {
    headers = row0;
    headerRowIndex = 1;
  } else {
    // Generate fallback column names
    headers = row0.map((_, i) => `Column ${i + 1}`);
  }

  // Identify Artist, Score, Review, Genre columns
  let artistColIdx = -1;
  let scoreColIdx = -1;
  let reviewColIdx = -1;
  let genreColIdx = -1;

  headers.forEach((h, idx) => {
    const l = h.toLowerCase().trim();
    if (
      artistColIdx === -1 &&
      (l.includes('artist') ||
        l.includes('band') ||
        l.includes('act') ||
        l === 'name' ||
        l.startsWith('name') ||
        l.includes('musician') ||
        l.includes('performer') ||
        l.includes('lineup'))
    ) {
      artistColIdx = idx;
    } else if (
      scoreColIdx === -1 &&
      (l.includes('rating') ||
        l.includes('score') ||
        l.includes('number') ||
        l === 'num' ||
        l === 'no.' ||
        l === 'no' ||
        l.includes('rank') ||
        l.includes('points') ||
        l.includes('stars') ||
        l.includes('/10') ||
        l.includes('/5') ||
        l.includes('/4') ||
        l.includes('/100') ||
        l.includes('mark') ||
        l.includes('grade') ||
        l.includes('avg') ||
        l.includes('aggregate') ||
        l.includes('val'))
    ) {
      scoreColIdx = idx;
    } else if (
      reviewColIdx === -1 &&
      (l.includes('review') ||
        l.includes('summary') ||
        l.includes('notes') ||
        l.includes('note') ||
        l.includes('comment') ||
        l.includes('thoughts') ||
        l.includes('verdict') ||
        l.includes('description') ||
        l.includes('bio') ||
        l.includes('reasons') ||
        l.includes('why'))
    ) {
      reviewColIdx = idx;
    } else if (
      genreColIdx === -1 &&
      (l.includes('genre') || l.includes('style') || l.includes('category') || l.includes('tag'))
    ) {
      genreColIdx = idx;
    }
  });

  // Fallbacks if not found by keywords
  if (artistColIdx === -1) {
    artistColIdx = 0; // Default first column
  }
  if (scoreColIdx === -1) {
    // Look for first column with numeric content
    for (let col = 0; col < headers.length; col++) {
      if (col === artistColIdx) continue;
      const sampleNumericCount = rows
        .slice(headerRowIndex, headerRowIndex + 5)
        .filter((r) => extractScoreAndExplicitScale(r[col]) !== null).length;
      if (sampleNumericCount >= 2) {
        scoreColIdx = col;
        break;
      }
    }
    if (scoreColIdx === -1 && headers.length > 1) {
      scoreColIdx = artistColIdx === 0 ? 1 : 0;
    }
  }

  if (reviewColIdx === -1) {
    for (let col = 0; col < headers.length; col++) {
      if (col !== artistColIdx && col !== scoreColIdx && col !== genreColIdx) {
        reviewColIdx = col;
        break;
      }
    }
  }

  // Collect raw scores to detect scale
  const rawScores: number[] = [];
  const explicitScales: number[] = [];

  const dataRows = rows.slice(headerRowIndex);

  dataRows.forEach((row) => {
    const artist = String(row[artistColIdx] || '').trim();
    if (!artist) return;
    const extracted = extractScoreAndExplicitScale(row[scoreColIdx]);
    if (extracted) {
      rawScores.push(extracted.score);
      if (extracted.scale) {
        explicitScales.push(extracted.scale);
      }
    }
  });

  const scoreHeaderName = headers[scoreColIdx] || '';
  const scaleDetection = detectRatingScale(rawScores, explicitScales, scoreHeaderName, scaleOverride);
  const finalScale = scaleDetection.scale;

  // Build UserRating objects
  const ratings: UserRating[] = [];

  dataRows.forEach((row, index) => {
    const artist = String(row[artistColIdx] || '').trim();
    if (!artist) return;

    const rawScoreVal = row[scoreColIdx];
    const extracted = extractScoreAndExplicitScale(rawScoreVal);

    const isRated = extracted !== null && typeof extracted.score === 'number' && !isNaN(extracted.score);
    let rawScore: number | string | null = null;
    let normalized = 0;
    let itemScale = finalScale;

    if (isRated && extracted) {
      rawScore = extracted.score;
      if (extracted.scale) {
        itemScale = extracted.scale;
      }
      normalized = normalizeScore(extracted.score, itemScale);
    } else if (rawScoreVal !== undefined && rawScoreVal !== null && String(rawScoreVal).trim() !== '' && String(rawScoreVal).trim() !== '#N/A') {
      rawScore = String(rawScoreVal).trim();
    }

    const rawReview = reviewColIdx !== -1 && row[reviewColIdx] ? String(row[reviewColIdx]).trim() : '';
    const isReviewed = rawReview.length > 0 && rawReview !== '#N/A' && rawReview !== '-' && rawReview !== '—';
    const reviewSummary = isReviewed ? rawReview : '';
    const genre = genreColIdx !== -1 && row[genreColIdx] ? String(row[genreColIdx]).trim() : undefined;

    ratings.push({
      id: `rating-${index + 1}`,
      artist,
      rawScore,
      normalizedScore: normalized,
      isRated,
      isReviewed,
      detectedScale: isRated ? `Scale 1-${itemScale}` : 'Unrated',
      reviewSummary,
      genre,
      isSelected: true,
    });
  });

  const ratedCount = ratings.filter((r) => r.isRated).length;

  return {
    ratings,
    detectedScale: scaleDetection.description,
    detectedMax: finalScale,
    totalRows: dataRows.length,
    validRatingsCount: ratedCount > 0 ? ratedCount : ratings.filter((r) => r.isReviewed).length,
    artistColumn: headers[artistColIdx] || `Col ${artistColIdx + 1}`,
    scoreColumn: headers[scoreColIdx] || `Col ${scoreColIdx + 1}`,
    reviewColumn: reviewColIdx !== -1 ? headers[reviewColIdx] || `Col ${reviewColIdx + 1}` : 'None',
    genreColumn: genreColIdx !== -1 ? headers[genreColIdx] : undefined,
    rawHeaders: headers,
    activeTabName: tabMeta?.activeTabName,
    activeTabGid: tabMeta?.activeTabGid,
    availableTabs: tabMeta?.availableTabs,
    sourceUrl: tabMeta?.sourceUrl,
    sourceType: tabMeta?.sourceType,
  };
}
