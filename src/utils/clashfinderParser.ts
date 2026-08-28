import Papa from 'papaparse';
import { FestivalData, FestivalDay, FestivalSet } from '../types';

export interface ParsedDateTime {
  time24: string; // HH:MM
  isoDate?: string; // YYYY-MM-DD
  effectiveFestivalDate?: string; // YYYY-MM-DD (accounting for past-midnight sets)
  displayDate?: string; // DD/MM/YYYY
  hours: number;
  minutes: number;
}

/**
 * Standardizes any time or date-time string into HH:MM 24-hour format
 * Handles "20/08/2026 11:00", "19/08/2026 23:30", "20/08/2026 02:30",
 * "2026-08-20T14:30:00", "2:30 PM", "11.45am", "1430", "14:30"
 */
export function formatTime24h(timeStr: string): string {
  if (!timeStr) return '00:00';
  const parsed = parseDateTimeValue(timeStr);
  return parsed.time24;
}

/**
 * Subtracts one day from an ISO YYYY-MM-DD string
 */
function subtractOneDayIso(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().split('T')[0];
}

/**
 * Returns formatted human-friendly day name from ISO date (e.g. "Friday 21 Aug")
 */
export function getFriendlyDayName(isoDate: string, index?: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return `Day ${index !== undefined ? index + 1 : 1}`;

  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayOfWeek = dayNames[dateObj.getUTCDay()];
  const month = monthNames[dateObj.getUTCMonth()];
  return `${dayOfWeek} ${d} ${month}`;
}

/**
 * Parses any date-time representation and extracts time in 24h, ISO date, and effective festival day
 * @param val Input string (e.g. "20/08/2026 11:00", "19/08/2026 23:30", "20/08/2026 02:30")
 * @param morningCutoffHour Hour of the morning before which sets belong to the previous festival day (default 6 AM)
 */
export function parseDateTimeValue(val: string, morningCutoffHour: number = 6): ParsedDateTime {
  if (!val) {
    return { time24: '12:00', hours: 12, minutes: 0 };
  }

  const clean = String(val).trim();
  let isoDate: string | undefined;
  let displayDate: string | undefined;
  let hours = 12;
  let minutes = 0;
  let timeExtracted = false;

  // 1. European / UK Date-Time format: "DD/MM/YYYY HH:MM(:SS) (AM/PM)" or "DD-MM-YYYY HH:MM"
  const ddmmyyyyMatch = clean.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[T\s]+(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)?)?/i
  );
  if (ddmmyyyyMatch) {
    const rawD = parseInt(ddmmyyyyMatch[1], 10);
    const rawM = parseInt(ddmmyyyyMatch[2], 10);
    let rawY = parseInt(ddmmyyyyMatch[3], 10);
    if (rawY < 100) rawY += 2000;

    displayDate = `${rawD.toString().padStart(2, '0')}/${rawM.toString().padStart(2, '0')}/${rawY}`;
    isoDate = `${rawY}-${rawM.toString().padStart(2, '0')}-${rawD.toString().padStart(2, '0')}`;

    if (ddmmyyyyMatch[4] !== undefined && ddmmyyyyMatch[5] !== undefined) {
      hours = parseInt(ddmmyyyyMatch[4], 10);
      minutes = parseInt(ddmmyyyyMatch[5], 10);
      const modifier = ddmmyyyyMatch[6]?.toLowerCase();
      if (modifier === 'pm' && hours < 12) hours += 12;
      if (modifier === 'am' && hours === 12) hours = 0;
      timeExtracted = true;
    }
  }

  // 2. ISO Date-Time format: "YYYY-MM-DD HH:MM(:SS)" or "YYYY/MM/DD HH:MM" or "YYYY-MM-DDTHH:MM:SS"
  if (!timeExtracted) {
    const isoMatch = clean.match(
      /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:[T\s]+(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)?)?/i
    );
    if (isoMatch) {
      const rawY = parseInt(isoMatch[1], 10);
      const rawM = parseInt(isoMatch[2], 10);
      const rawD = parseInt(isoMatch[3], 10);

      displayDate = `${rawD.toString().padStart(2, '0')}/${rawM.toString().padStart(2, '0')}/${rawY}`;
      isoDate = `${rawY}-${rawM.toString().padStart(2, '0')}-${rawD.toString().padStart(2, '0')}`;

      if (isoMatch[4] !== undefined && isoMatch[5] !== undefined) {
        hours = parseInt(isoMatch[4], 10);
        minutes = parseInt(isoMatch[5], 10);
        const modifier = isoMatch[6]?.toLowerCase();
        if (modifier === 'pm' && hours < 12) hours += 12;
        if (modifier === 'am' && hours === 12) hours = 0;
        timeExtracted = true;
      }
    }
  }

  // 3. If time was not extracted yet, search for trailing or standalone time string:
  if (!timeExtracted) {
    // 12-hour AM/PM e.g. "2:30 PM", "11:45am", "2.30pm", "11pm"
    const ampmMatch = clean.match(/(?:^|\s+|T)(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)$/i);
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1], 10);
      minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
      const modifier = ampmMatch[3].toLowerCase();
      if (modifier === 'pm' && hours < 12) hours += 12;
      if (modifier === 'am' && hours === 12) hours = 0;
      timeExtracted = true;
    } else {
      // 24-hour e.g. "14:30", "14:30:00", "02.30"
      const stdMatch = clean.match(/(?:^|\s+|T)(\d{1,2})[:.](\d{2})(?::\d{2})?(?:\s|$)/);
      if (stdMatch) {
        hours = parseInt(stdMatch[1], 10);
        minutes = parseInt(stdMatch[2], 10);
        timeExtracted = true;
      } else if (/^\d{4}$/.test(clean)) {
        // 4 digits "1430"
        hours = parseInt(clean.slice(0, 2), 10);
        minutes = parseInt(clean.slice(2, 4), 10);
        timeExtracted = true;
      }
    }
  }

  // Clamp hours & minutes
  if (isNaN(hours) || hours < 0 || hours > 23) hours = 12;
  if (isNaN(minutes) || minutes < 0 || minutes > 59) minutes = 0;

  const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  // Calculate effective festival date:
  // If set starts in the early hours of the morning (e.g. 00:00 - 05:59 AM),
  // it belongs to the PREVIOUS calendar day's festival programme!
  let effectiveFestivalDate = isoDate;
  if (isoDate && hours < morningCutoffHour) {
    effectiveFestivalDate = subtractOneDayIso(isoDate);
  }

  return {
    time24,
    isoDate,
    effectiveFestivalDate,
    displayDate,
    hours,
    minutes,
  };
}

/**
 * Converts HH:MM into minutes from start of festival day (allowing sets past midnight, e.g. 01:30 = 25.5h)
 */
export function timeToMinutes(timeStr: string, dayStartHour: number = 6): number {
  const parsed = parseDateTimeValue(timeStr, dayStartHour);
  let totalHours = parsed.hours;
  // If time is in the early morning (before festival daily reset cutoff e.g. 00:00 to 05:59),
  // treat as past-midnight late night on the same festival day (+24 hours)
  if (parsed.hours < dayStartHour) {
    totalHours += 24;
  }
  return totalHours * 60 + parsed.minutes;
}

/**
 * Helper to test if a string looks like a date/time
 */
function isDateTimeCell(cellStr: string): boolean {
  if (!cellStr) return false;
  const s = cellStr.trim();
  // Matches "20/08/2026 11:00", "2026-08-20 11:00", "20/08/2026", "11:00", "2:30 PM", "23:30"
  if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}(\s+\d{1,2}[:.]\d{2})?/.test(s)) return true;
  if (/^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}/.test(s)) return true;
  if (/^\d{1,2}[:.]\d{2}(\s*(am|pm))?$/i.test(s)) return true;
  return false;
}

/**
 * Parse Clashfinder or standard festival CSV
 */
export function parseClashfinderCsv(csvText: string, festivalNameHint: string = 'Festival Lineup'): FestivalData {
  const cleanInput = csvText.trim();
  const parsed = Papa.parse<any[]>(cleanInput, {
    header: false,
    skipEmptyLines: true,
  });

  if (!parsed.data || parsed.data.length === 0) {
    return {
      name: festivalNameHint,
      days: [],
      stages: [],
      sets: [],
      sourceType: 'clashfinder',
    };
  }

  const rawRows = parsed.data;
  let headerRowIndex = -1;
  let headers: string[] = [];

  // Check if first row is a header
  const firstRow = rawRows[0].map((c: any) => String(c || '').trim());
  const firstRowJoined = firstRow.join(' ').toLowerCase();

  if (
    firstRowJoined.includes('venue') ||
    firstRowJoined.includes('stage') ||
    firstRowJoined.includes('act') ||
    firstRowJoined.includes('artist') ||
    firstRowJoined.includes('start') ||
    firstRowJoined.includes('end')
  ) {
    headerRowIndex = 0;
    headers = firstRow;
  }

  const dataRows = headerRowIndex !== -1 ? rawRows.slice(headerRowIndex + 1) : rawRows;

  // Column Index mapping
  let dayCol = -1;
  let stageCol = -1;
  let startCol = -1;
  let endCol = -1;
  let artistCol = -1;
  let notesCol = -1;

  if (headers.length > 0) {
    headers.forEach((h, idx) => {
      const l = h.toLowerCase().trim();
      if (startCol === -1 && (l === 'start' || l.includes('start') || l.includes('from') || l === 'on')) {
        startCol = idx;
      } else if (endCol === -1 && (l === 'end' || l.includes('end') || l.includes('finish') || l.includes('to') || l === 'off')) {
        endCol = idx;
      } else if (artistCol === -1 && (l === 'act' || l === 'artist' || l.includes('band') || l.includes('artist') || l === 'name' || l.includes('performer'))) {
        artistCol = idx;
      } else if (stageCol === -1 && (l === 'venue' || l === 'stage' || l.includes('stage') || l.includes('venue') || l.includes('location') || l.includes('tent'))) {
        stageCol = idx;
      } else if (dayCol === -1 && (l === 'day' || l.includes('day') || l === 'date' || l.includes('date'))) {
        dayCol = idx;
      } else if (notesCol === -1 && (l.includes('comment') || l.includes('note') || l.includes('desc') || l.includes('summary'))) {
        notesCol = idx;
      }
    });
  }

  // Clashfinder standard default ordering if headers not matched or partially matched:
  // Clashfinder standard download CSV: Venue, Act, Start, End, Comments (5 columns)
  // Or Day, Stage, Start, End, Act, Comments (6 columns)
  if (startCol === -1 || endCol === -1 || artistCol === -1) {
    // Scan sample data rows to deduce column types
    const sampleRows = dataRows.slice(0, 10);
    const colTypes: { [colIdx: number]: { dateTimeScore: number; distinctValues: Set<string> } } = {};

    sampleRows.forEach((r) => {
      r.forEach((cell: any, cIdx: number) => {
        const val = String(cell || '').trim();
        if (!colTypes[cIdx]) {
          colTypes[cIdx] = { dateTimeScore: 0, distinctValues: new Set() };
        }
        if (val) {
          colTypes[cIdx].distinctValues.add(val);
          if (isDateTimeCell(val)) {
            colTypes[cIdx].dateTimeScore += 1;
          }
        }
      });
    });

    const dateTimeCols = Object.keys(colTypes)
      .map(Number)
      .filter((cIdx) => colTypes[cIdx].dateTimeScore >= Math.min(2, sampleRows.length / 2))
      .sort((a, b) => a - b);

    if (dateTimeCols.length >= 2) {
      startCol = dateTimeCols[0];
      endCol = dateTimeCols[1];
    }

    // Standard Clashfinder pattern: Col 0 = Stage/Venue, Col 1 = Act/Artist, Col 2 = Start, Col 3 = End, Col 4 = Notes
    if (startCol === 2 && endCol === 3) {
      if (stageCol === -1) stageCol = 0;
      if (artistCol === -1) artistCol = 1;
      if (notesCol === -1 && headers.length > 4) notesCol = 4;
    } else if (startCol === 0 && endCol === 1) {
      // Start, End, Stage, Act pattern
      if (stageCol === -1) stageCol = 2;
      if (artistCol === -1) artistCol = 3;
    } else if (startCol === 1 && endCol === 2) {
      // Act, Start, End, Stage
      if (artistCol === -1) artistCol = 0;
      if (stageCol === -1) stageCol = 3;
    } else {
      // Fallback
      if (stageCol === -1) stageCol = 0;
      if (artistCol === -1) artistCol = 1;
      if (startCol === -1) startCol = 2;
      if (endCol === -1) endCol = 3;
    }
  }

  interface RawSetItem {
    artist: string;
    stage: string;
    rawDay?: string;
    parsedStart: ParsedDateTime;
    parsedEnd: ParsedDateTime;
    notes?: string;
  }

  const rawSets: RawSetItem[] = [];
  const stagesSet = new Set<string>();

  dataRows.forEach((row) => {
    const artist = artistCol !== -1 ? String(row[artistCol] || '').trim() : '';
    if (!artist || artist === 'Act' || artist === 'Artist' || artist.toLowerCase() === 'name') return;

    const rawStage = stageCol !== -1 ? String(row[stageCol] || '').trim() : 'Main Stage';
    if (rawStage === 'Venue' || rawStage === 'Stage') return;

    const rawStart = startCol !== -1 ? String(row[startCol] || '').trim() : '12:00';
    const rawEnd = endCol !== -1 ? String(row[endCol] || '').trim() : '13:00';
    const rawDay = dayCol !== -1 && row[dayCol] ? String(row[dayCol]).trim() : undefined;
    const notes = notesCol !== -1 && row[notesCol] ? String(row[notesCol]).trim() : undefined;

    const parsedStart = parseDateTimeValue(rawStart, 6);
    const parsedEnd = parseDateTimeValue(rawEnd, 6);

    const stageName = rawStage || 'Main Stage';
    stagesSet.add(stageName);

    rawSets.push({
      artist,
      stage: stageName,
      rawDay,
      parsedStart,
      parsedEnd,
      notes,
    });
  });

  // Determine festival days
  // 1. Group sets by effective festival date (or by rawDay if explicit and distinct)
  const uniqueDatesMap = new Map<string, { date: string; dayName: string; count: number }>();
  const explicitDaysMap = new Map<string, string>(); // rawDay -> dayName

  // Check if rawDay provides genuine multi-day groupings
  const distinctRawDays = new Set(rawSets.map((s) => s.rawDay).filter(Boolean));
  const hasDistinctRawDays = distinctRawDays.size > 1;

  rawSets.forEach((s) => {
    // Effective festival date accounts for sets extending past midnight (e.g. 23:30-02:30 -> stays on start day)
    const effectiveDate = s.parsedStart.effectiveFestivalDate || s.parsedStart.isoDate || '2026-06-26';
    if (!uniqueDatesMap.has(effectiveDate)) {
      uniqueDatesMap.set(effectiveDate, {
        date: effectiveDate,
        dayName: getFriendlyDayName(effectiveDate, uniqueDatesMap.size),
        count: 0,
      });
    }
    const cur = uniqueDatesMap.get(effectiveDate)!;
    cur.count += 1;

    if (s.rawDay) {
      explicitDaysMap.set(s.rawDay, s.rawDay);
    }
  });

  // Sort dates chronologically
  const sortedDates = Array.from(uniqueDatesMap.keys()).sort();

  const days: FestivalDay[] = [];
  const dateToDayIdMap = new Map<string, string>();
  const rawDayToDayIdMap = new Map<string, string>();

  if (sortedDates.length > 0 && (!hasDistinctRawDays || sortedDates.length >= distinctRawDays.size)) {
    // Generate days from detected festival dates
    sortedDates.forEach((isoDate, idx) => {
      const dayId = `day-${isoDate}`;
      const dayInfo = uniqueDatesMap.get(isoDate)!;
      const friendlyName = getFriendlyDayName(isoDate, idx);

      days.push({
        id: dayId,
        name: friendlyName,
        date: isoDate,
      });
      dateToDayIdMap.set(isoDate, dayId);
    });
  } else if (hasDistinctRawDays) {
    // Use explicit raw day names
    Array.from(distinctRawDays).forEach((rDay, idx) => {
      if (!rDay) return;
      const dayId = rDay.toLowerCase().replace(/[^\w]/g, '-') || `day-${idx + 1}`;
      days.push({
        id: dayId,
        name: rDay,
      });
      rawDayToDayIdMap.set(rDay, dayId);
    });
  }

  if (days.length === 0) {
    days.push({ id: 'day-1', name: 'Festival Day' });
  }

  const daysLookup = new Map(days.map((d) => [d.id, d]));

  // Build finalized FestivalSet array
  const sets: FestivalSet[] = rawSets.map((s, index) => {
    let dayId = days[0].id;
    const effectiveDate = s.parsedStart.effectiveFestivalDate || s.parsedStart.isoDate;

    if (effectiveDate && dateToDayIdMap.has(effectiveDate)) {
      dayId = dateToDayIdMap.get(effectiveDate)!;
    } else if (s.rawDay && rawDayToDayIdMap.has(s.rawDay)) {
      dayId = rawDayToDayIdMap.get(s.rawDay)!;
    }

    const dayName = daysLookup.get(dayId)?.name || 'Festival Day';

    return {
      id: `set-${index + 1}`,
      artist: s.artist,
      stage: s.stage,
      dayId,
      dayName,
      startTime: s.parsedStart.time24,
      endTime: s.parsedEnd.time24,
      fullStartIso: s.parsedStart.isoDate,
      fullEndIso: s.parsedEnd.isoDate,
      description: s.notes,
    };
  });

  // Sort sets within each day by start time (handling past midnight properly)
  sets.sort((a, b) => {
    if (a.dayId !== b.dayId) {
      const idxA = days.findIndex((d) => d.id === a.dayId);
      const idxB = days.findIndex((d) => d.id === b.dayId);
      return idxA - idxB;
    }
    const minA = timeToMinutes(a.startTime, 6);
    const minB = timeToMinutes(b.startTime, 6);
    return minA - minB;
  });

  const stages = Array.from(stagesSet);

  return {
    name: festivalNameHint,
    days,
    stages: stages.length > 0 ? stages : ['Main Stage'],
    sets,
    sourceType: 'clashfinder',
  };
}
