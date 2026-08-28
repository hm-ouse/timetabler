import { MatchedScheduleItem, FestivalData } from '../types';

/**
 * Helper to format date string to iCalendar DTSTART / DTEND (UTC format: YYYYMMDDTHHMMSSZ or local YYYYMMDDTHHMMSS)
 */
function toIcsDateTime(dateStr: string, timeStr: string): string {
  // dateStr in YYYY-MM-DD format
  const cleanDate = dateStr.replace(/-/g, '');
  const [hours, minutes] = timeStr.split(':').map((s) => s.padStart(2, '0'));
  return `${cleanDate}T${hours}${minutes}00`;
}

/**
 * Formats a Google Calendar URL parameter date
 */
function toGCalDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const [hours, minutes] = timeStr.split(':').map((s) => s.padStart(2, '0'));
  return `${cleanDate}T${hours}${minutes}00`;
}

/**
 * Derives a valid calendar date for each day ID
 */
export function getFestivalDayDate(dayId: string, dayName: string, index: number, baseDate?: string): string {
  if (baseDate && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + index);
    return d.toISOString().split('T')[0];
  }

  // Default to a realistic upcoming weekend if none specified: e.g. 2026-06-26 (Friday)
  const defaultYear = 2026;
  const defaultMonth = 6; // June
  const defaultBaseDay = 26; // Friday

  // Try extracting day name if it has day of week
  const l = (dayName || dayId).toLowerCase();
  let dayOffset = index;
  if (l.includes('wed')) dayOffset = 0;
  else if (l.includes('thu')) dayOffset = 1;
  else if (l.includes('fri')) dayOffset = 2;
  else if (l.includes('sat')) dayOffset = 3;
  else if (l.includes('sun')) dayOffset = 4;
  else if (l.includes('mon')) dayOffset = 5;

  const d = new Date(Date.UTC(defaultYear, defaultMonth - 1, defaultBaseDay + dayOffset));
  return d.toISOString().split('T')[0];
}

/**
 * Generates an RFC 5545 compliant .ics iCalendar file string
 */
export function generateIcsCalendar(
  items: MatchedScheduleItem[],
  festival: FestivalData
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//timetabler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${festival.name} - My Timetable`,
    `X-WR-TIMEZONE:Europe/London`,
  ];

  const daysMap = new Map(festival.days.map((d, idx) => [d.id, { ...d, index: idx }]));

  items.forEach((item, index) => {
    if (item.status === 'skipped') return;

    const dayInfo = daysMap.get(item.set.dayId);
    const dayIndex = dayInfo ? dayInfo.index : 0;
    const dateStr = getFestivalDayDate(item.set.dayId, item.set.dayName, dayIndex, dayInfo?.date);

    // If set starts or ends after midnight, adjust calendar dates
    const [startH] = item.set.startTime.split(':').map(Number);
    const [endH] = item.set.endTime.split(':').map(Number);

    let startDateStr = dateStr;
    if (startH < 6) {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      startDateStr = d.toISOString().split('T')[0];
    }

    let endDateStr = startDateStr;
    if (endH < startH || (endH < 6 && startH >= 6)) {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      endDateStr = d.toISOString().split('T')[0];
    }

    const dtStart = toIcsDateTime(startDateStr, item.set.startTime);
    const dtEnd = toIcsDateTime(endDateStr, item.set.endTime);
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const ratingNote = item.rating
      ? `Rating: ${item.normalizedScore}% (${item.rating.rawScore} ${item.rating.detectedScale})\nReview Summary: ${item.rating.reviewSummary || 'N/A'}\n${item.rating.genre ? `Genre: ${item.rating.genre}\n` : ''}`
      : 'User Rating: Unrated';

    const description = `${ratingNote}\nStage: ${item.set.stage}\nFestival: ${festival.name}\n${item.set.description ? `Set Details: ${item.set.description}\n` : ''}\nCreated with timetabler`;

    // Escape iCal special characters
    const cleanSummary = `${item.set.artist} @ ${item.set.stage} [${item.normalizedScore}%]`
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
    const cleanLocation = `${item.set.stage}, ${festival.name}`
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
    const cleanDesc = description
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');

    lines.push(
      'BEGIN:VEVENT',
      `UID:fest-set-${item.set.id}-${index}@festivallineup.local`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${cleanSummary}`,
      `LOCATION:${cleanLocation}`,
      `DESCRIPTION:${cleanDesc}`,
      'STATUS:CONFIRMED',
      // 15-minute advance reminder alarm
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${item.set.artist} starts in 15 mins at ${item.set.stage}!`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers browser download of .ics file
 */
export function downloadIcsFile(items: MatchedScheduleItem[], festival: FestivalData) {
  const icsContent = generateIcsCalendar(items, festival);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `${festival.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_timetable.ics`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates direct Google Calendar web URL for a single set
 */
export function createGoogleCalendarUrl(item: MatchedScheduleItem, festival: FestivalData): string {
  const dateStr = getFestivalDayDate(item.set.dayId, item.set.dayName, 0);
  const [startH] = item.set.startTime.split(':').map(Number);
  const [endH] = item.set.endTime.split(':').map(Number);

  let startDateStr = dateStr;
  if (startH < 6) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    startDateStr = d.toISOString().split('T')[0];
  }

  let endDateStr = startDateStr;
  if (endH < startH || (endH < 6 && startH >= 6)) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    endDateStr = d.toISOString().split('T')[0];
  }

  const startIso = toGCalDateTime(startDateStr, item.set.startTime);
  const endIso = toGCalDateTime(endDateStr, item.set.endTime);

  const title = `${item.set.artist} @ ${item.set.stage}`;
  const details = `User Rating: ${item.normalizedScore}%\nReview Summary: ${item.rating?.reviewSummary || 'N/A'}\nStage: ${item.set.stage}\nFestival: ${festival.name}`;
  const location = `${item.set.stage}, ${festival.name}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

/**
 * Export customized schedule as clean CSV
 */
export function exportScheduleCsv(items: MatchedScheduleItem[], festival: FestivalData): void {
  const headers = ['Day', 'Start Time', 'End Time', 'Artist', 'Stage', 'Rating (%)', 'Original Score', 'Review Summary', 'Clashes', 'Status'];
  const rows = items.map((item) => [
    item.set.dayName || item.set.dayId,
    item.set.startTime,
    item.set.endTime,
    `"${item.set.artist.replace(/"/g, '""')}"`,
    `"${item.set.stage.replace(/"/g, '""')}"`,
    `${item.normalizedScore}%`,
    item.rating?.rawScore ? `"${item.rating.rawScore}"` : 'N/A',
    `"${(item.rating?.reviewSummary || '').replace(/"/g, '""')}"`,
    item.hasClash ? 'YES' : 'NO',
    item.status.toUpperCase(),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${festival.name.replace(/\s+/g, '_')}_my_timetable.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
