import { UserRating, FestivalSet, MatchedScheduleItem, ScoreTier, AttendanceStatus } from '../types';
import { normalizeArtistName } from './sheetParser';
import { timeToMinutes } from './clashfinderParser';

/**
 * Calculates similarity between two strings (0 to 1)
 */
function stringSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeArtistName(s1);
  const norm2 = normalizeArtistName(s2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  // Substring check
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const longer = Math.max(norm1.length, norm2.length);
    const shorter = Math.min(norm1.length, norm2.length);
    return 0.75 + (shorter / longer) * 0.25;
  }

  // Token overlap check (Jaccard similarity on words)
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size > 0 && intersection.size > 0) {
    const tokenScore = intersection.size / union.size;
    if (tokenScore >= 0.5) {
      return tokenScore;
    }
  }

  return 0.0;
}

/**
 * Determines score tier based on normalized percentage
 */
export function getScoreTier(normalizedScore: number, isRated: boolean = true): ScoreTier {
  if (!isRated) return 'unrated';
  if (normalizedScore >= 85) return 'must_see';
  if (normalizedScore >= 70) return 'recommended';
  if (normalizedScore >= 50) return 'medium';
  if (normalizedScore > 0) return 'low';
  return 'low';
}

/**
 * Checks if two festival sets clash (overlap in time on the same day)
 */
export function doSetsClash(setA: FestivalSet, setB: FestivalSet, dayStartHour: number = 6): boolean {
  if (setA.id === setB.id) return false;
  if (setA.dayId !== setB.dayId) return false;

  const startA = timeToMinutes(setA.startTime, dayStartHour);
  const endA = timeToMinutes(setA.endTime, dayStartHour);
  const startB = timeToMinutes(setB.startTime, dayStartHour);
  const endB = timeToMinutes(setB.endTime, dayStartHour);

  // Overlap condition: startA < endB and startB < endA
  return startA < endB && startB < endA;
}

/**
 * Matches festival lineup sets with user band ratings, checks clashes, and calculates elapsed state
 */
export function matchScheduleWithRatings(
  sets: FestivalSet[],
  ratings: UserRating[],
  minScorePercent: number = 60,
  referenceTime?: { dayId: string; time: string }, // current or simulated time
  userStatusOverrides: Record<string, AttendanceStatus> = {},
  dayStartHour: number = 6
): MatchedScheduleItem[] {
  // Map normalized artist name to UserRating
  const ratingsMap = new Map<string, UserRating>();
  ratings.forEach((r) => {
    ratingsMap.set(normalizeArtistName(r.artist), r);
  });

  const matchedItems: MatchedScheduleItem[] = [];

  sets.forEach((set) => {
    const normName = normalizeArtistName(set.artist);
    let matchedRating = ratingsMap.get(normName);
    let matchConfidence = matchedRating ? 1.0 : 0.0;

    // Fuzzy search if direct match not found
    if (!matchedRating) {
      let bestScore = 0;
      let bestRating: UserRating | undefined;
      for (const r of ratings) {
        const sim = stringSimilarity(set.artist, r.artist);
        if (sim > bestScore && sim >= 0.7) {
          bestScore = sim;
          bestRating = r;
        }
      }
      if (bestRating) {
        matchedRating = bestRating;
        matchConfidence = bestScore;
      }
    }

    const isRated = matchedRating ? !!matchedRating.isRated : false;
    const isReviewed = matchedRating ? !!matchedRating.isReviewed : false;
    const normalizedScore = isRated && matchedRating ? matchedRating.normalizedScore : 0;
    const tier = getScoreTier(normalizedScore, isRated);

    // Calculate elapsed and currently playing state
    let isElapsed = false;
    let isCurrentlyPlaying = false;

    if (referenceTime) {
      const refMinutes = timeToMinutes(referenceTime.time, dayStartHour);
      const setStartMin = timeToMinutes(set.startTime, dayStartHour);
      const setEndMin = timeToMinutes(set.endTime, dayStartHour);

      if (set.dayId === referenceTime.dayId) {
        if (refMinutes >= setEndMin) {
          isElapsed = true;
        } else if (refMinutes >= setStartMin && refMinutes < setEndMin) {
          isCurrentlyPlaying = true;
        }
      }
    }

    // Default status: if medium to high rating, default to 'attending'
    let status: AttendanceStatus =
      userStatusOverrides[set.id] || (isRated && normalizedScore >= minScorePercent ? 'attending' : 'maybe');

    matchedItems.push({
      id: set.id,
      set,
      rating: matchedRating,
      normalizedScore,
      isRated,
      isReviewed,
      tier,
      status,
      hasClash: false,
      clashingSetIds: [],
      isElapsed,
      isCurrentlyPlaying,
      matchScore: matchConfidence,
    });
  });

  // Calculate clashes among liked artists (normalizedScore >= minScorePercent or status === 'attending')
  const likedItems = matchedItems.filter(
    (item) => ((item.isRated && item.normalizedScore >= minScorePercent) || item.status === 'attending') && item.status !== 'skipped'
  );

  for (let i = 0; i < likedItems.length; i++) {
    for (let j = i + 1; j < likedItems.length; j++) {
      const itemA = likedItems[i];
      const itemB = likedItems[j];
      if (doSetsClash(itemA.set, itemB.set, dayStartHour)) {
        itemA.hasClash = true;
        itemA.clashingSetIds.push(itemB.id);
        itemB.hasClash = true;
        itemB.clashingSetIds.push(itemA.id);
      }
    }
  }

  return matchedItems;
}
