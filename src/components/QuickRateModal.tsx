import React, { useState } from 'react';
import { Star, X, Check, Sliders, Music, MessageSquare } from 'lucide-react';
import { getRatingColorMeta, RATING_SCALE_TIERS } from '../utils/ratingColors';

interface QuickRateModalProps {
  isOpen: boolean;
  artistName: string;
  currentScorePercent?: number;
  currentReview?: string;
  currentGenre?: string;
  onClose: () => void;
  onSaveRating: (artistName: string, newScorePercent: number, reviewSummary?: string, genre?: string) => void;
}

export const QuickRateModal: React.FC<QuickRateModalProps> = ({
  isOpen,
  artistName,
  currentScorePercent = 75,
  currentReview = '',
  currentGenre = '',
  onClose,
  onSaveRating,
}) => {
  const [score, setScore] = useState<number>(currentScorePercent > 0 ? currentScorePercent : 75);
  const [review, setReview] = useState<string>(currentReview);
  const [genre, setGenre] = useState<string>(currentGenre);

  React.useEffect(() => {
    if (isOpen) {
      setScore(currentScorePercent > 0 ? currentScorePercent : 75);
      setReview(currentReview || '');
      setGenre(currentGenre || '');
    }
  }, [isOpen, artistName, currentScorePercent, currentReview, currentGenre]);

  if (!isOpen) return null;

  const colorMeta = getRatingColorMeta(score);

  const presets = [
    { label: '10/10', score: 100, desc: 'Must See' },
    { label: '9/10', score: 90, desc: 'High Priority' },
    { label: '8/10', score: 80, desc: 'Recommended' },
    { label: '7/10', score: 70, desc: 'Good' },
    { label: '6/10', score: 60, desc: 'Solid' },
    { label: '5/10', score: 50, desc: 'Medium' },
    { label: '3/10', score: 30, desc: 'Low' },
  ];

  const handleSave = () => {
    onSaveRating(artistName, score, review, genre);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="quick-rate-modal"
        className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Rate / Re-Rate Act</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px] font-medium">{artistName}</p>
            </div>
          </div>
          <button
            id="btn-close-quick-rate"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Live Score Display Card */}
          <div className={`p-4 rounded-xl border transition-all ${colorMeta.bgClass} ${colorMeta.borderClass} ${colorMeta.glowClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">
                  Normalized Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-mono font-black ${colorMeta.textClass}`}>
                    {score}%
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    ({(score / 10).toFixed(1)}/10)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${colorMeta.badgeClass}`}>
                  {colorMeta.tierName}
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="mt-3 space-y-1.5">
              <input
                id="quick-rate-slider"
                type="range"
                min="0"
                max="100"
                step="5"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0%</span>
                <span>50%</span>
                <span>70%</span>
                <span>85%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Quick Presets for fast on-the-go tapping */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">
              Quick Tap Presets
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setScore(p.score)}
                  className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition flex flex-col items-center justify-center min-h-[44px] ${
                    score === p.score
                      ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Review Note & Genre */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Review / Live Note (Optional)</span>
              </label>
              <input
                type="text"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="e.g. Unbelievable live energy, synth solos..."
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-slate-400" />
                <span>Genre Tag (Optional)</span>
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Post-Punk, Electronic, Indie"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#0f172a] border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition min-h-[40px]"
          >
            Cancel
          </button>
          <button
            id="btn-submit-quick-rate"
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-md shadow-emerald-950/40 flex items-center gap-1.5 min-h-[40px]"
          >
            <Check className="w-4 h-4" />
            <span>Save Rating</span>
          </button>
        </div>
      </div>
    </div>
  );
};
