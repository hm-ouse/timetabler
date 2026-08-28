import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  Star,
  CheckCircle2,
  ExternalLink,
  Music,
  Share2,
  X,
  Edit3,
  Sliders,
  Check,
  MessageSquare,
} from 'lucide-react';
import { MatchedScheduleItem, FestivalData, AttendanceStatus } from '../types';
import { createGoogleCalendarUrl } from '../utils/calendarExport';
import { getRatingColorMeta, RATING_SCALE_TIERS } from '../utils/ratingColors';

interface ArtistDetailModalProps {
  item: MatchedScheduleItem | null;
  festival: FestivalData;
  onClose: () => void;
  onToggleStatus: (setId: string, newStatus: AttendanceStatus) => void;
  onRateArtist?: (
    artistName: string,
    newScorePercent: number,
    reviewSummary?: string,
    genre?: string
  ) => void;
}

export const ArtistDetailModal: React.FC<ArtistDetailModalProps> = ({
  item,
  festival,
  onClose,
  onToggleStatus,
  onRateArtist,
}) => {
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [editedScore, setEditedScore] = useState<number>(item?.isRated ? item.normalizedScore : 75);
  const [editedReview, setEditedReview] = useState<string>(item?.rating?.reviewSummary || '');
  const [editedGenre, setEditedGenre] = useState<string>(item?.rating?.genre || '');

  // Keep edited state in sync when item updates or modal switches
  useEffect(() => {
    if (item) {
      setEditedScore(item.isRated ? item.normalizedScore : 75);
      setEditedReview(item.rating?.reviewSummary || '');
      setEditedGenre(item.rating?.genre || '');
    }
  }, [item?.id, item?.rating?.reviewSummary, item?.rating?.genre, item?.normalizedScore, item?.isRated]);

  if (!item) return null;

  const colorMeta = getRatingColorMeta(item.normalizedScore, item.isRated);
  const editingColorMeta = getRatingColorMeta(editedScore, true);

  const gcalUrl = createGoogleCalendarUrl(item, festival);
  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(item.set.artist)}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.set.artist + ' live')}`;

  const handleSaveEditedRating = () => {
    if (onRateArtist) {
      onRateArtist(item.set.artist, editedScore, editedReview, editedGenre);
    }
    setIsEditingRating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="artist-detail-modal"
        className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold ${colorMeta.badgeClass}`}>
              {item.isRated
                ? `${item.normalizedScore}% Match (${colorMeta.tierName})`
                : item.isReviewed
                ? 'Notes Only (Unscored)'
                : 'Unrated Band'}
            </span>
            {item.isCurrentlyPlaying && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 animate-pulse uppercase tracking-wider">
                NOW PLAYING
              </span>
            )}
          </div>
          <button
            id="btn-close-artist-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Main Title & Stage */}
          <div className={`p-4 rounded-xl border ${colorMeta.bgClass} ${colorMeta.borderClass} ${colorMeta.borderLeftClass}`}>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{item.set.artist}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{item.set.stage}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 font-mono text-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {item.set.dayName || item.set.dayId} ({item.set.startTime} - {item.set.endTime})
                </span>
              </span>
            </div>
          </div>

          {/* Clash Alert if present */}
          {item.hasClash && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[11px] text-rose-300">Schedule Clash Conflict</p>
                <p className="mt-0.5 text-slate-300">
                  This set overlaps with another act you want to see. You can resolve priority in the Clash Inspector.
                </p>
              </div>
            </div>
          )}

          {/* Re-Rate Section / Rating Overview */}
          <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Rating & Review Intelligence
              </span>
              <button
                id="btn-toggle-edit-rating"
                type="button"
                onClick={() => {
                  setEditedScore(item.isRated ? item.normalizedScore : 75);
                  setEditedReview(item.rating?.reviewSummary || '');
                  setEditedGenre(item.rating?.genre || '');
                  setIsEditingRating(!isEditingRating);
                }}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/30"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingRating ? 'Cancel Edit' : item.isRated ? 'Re-Rate Act' : '+ Rate Act'}</span>
              </button>
            </div>

            {isEditingRating ? (
              /* Inline Edit Mode */
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className={`p-3 rounded-lg border ${editingColorMeta.bgClass} ${editingColorMeta.borderClass}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-slate-300">Adjust Score</span>
                    <span className={`text-base font-mono font-black ${editingColorMeta.textClass}`}>
                      {editedScore}% ({editingColorMeta.tierName})
                    </span>
                  </div>
                  <input
                    id="artist-modal-score-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editedScore}
                    onChange={(e) => setEditedScore(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>0% (Pass)</span>
                    <span>50% (Med)</span>
                    <span>70% (Rec)</span>
                    <span>85% (High)</span>
                    <span>100% (Top)</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-5 gap-1 text-[11px] font-mono">
                  {[
                    { label: '10/10', v: 100 },
                    { label: '9/10', v: 90 },
                    { label: '8/10', v: 80 },
                    { label: '7/10', v: 70 },
                    { label: '5/10', v: 50 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setEditedScore(p.v)}
                      className={`py-1 rounded font-bold transition ${
                        editedScore === p.v
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                    Review / Notes
                  </label>
                  <input
                    type="text"
                    value={editedReview}
                    onChange={(e) => setEditedReview(e.target.value)}
                    placeholder="e.g. Blistering live show, guitar solos..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingRating(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditedRating}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save New Rating</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Read Mode */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold">Review Notes</span>
                  {item.isRated && item.rating?.rawScore ? (
                    <span className="font-mono text-slate-300">
                      Raw: {item.rating.rawScore} ({item.rating.detectedScale})
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-[11px]">Unrated</span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
                  {item.rating?.reviewSummary
                    ? `"${item.rating.reviewSummary}"`
                    : item.isRated
                    ? 'No written review notes in sheet.'
                    : 'This band has not been rated yet in your sheet. Click "+ Rate Act" to set a custom rating & review!'}
                </p>
                {item.rating?.genre && (
                  <p className="text-[11px] text-slate-400">
                    Genre: <span className="text-slate-200 font-medium">{item.rating.genre}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Attendance Action Choice */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Schedule Attendance Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'attending', label: '✓ Going / Must See', color: 'bg-emerald-600 text-white' },
                  { id: 'maybe', label: '? Maybe / Floating', color: 'bg-amber-600 text-white' },
                  { id: 'skipped', label: '✕ Skip / Conflicted', color: 'bg-slate-800 text-slate-400' },
                ] as const
              ).map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => onToggleStatus(item.id, status.id)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition min-h-[44px] flex items-center justify-center text-center ${
                    item.status === status.id
                      ? `${status.color} border-transparent shadow-md ring-2 ring-white/20`
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* External Links */}
          <div className="pt-1 grid grid-cols-3 gap-2">
            <a
              href={gcalUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700 min-h-[44px]"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>G-Cal</span>
            </a>
            <a
              href={spotifySearchUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700 min-h-[44px]"
            >
              <Music className="w-3.5 h-3.5 text-green-400" />
              <span>Spotify</span>
            </a>
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700 min-h-[44px]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              <span>Live Video</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

