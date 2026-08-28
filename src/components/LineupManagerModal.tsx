import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  Layers,
  ClipboardPaste,
  CheckCircle,
  AlertCircle,
  FileText,
  Calendar,
  X,
  RefreshCw,
} from 'lucide-react';
import { FestivalData, FestivalSet } from '../types';
import { parseFestivalCsv, formatTime24h } from '../utils/timetableParser';
import { SAMPLE_FESTIVALS } from '../data/samplePresets';

interface LineupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFestival: FestivalData;
  onUpdateFestival: (festival: FestivalData) => void;
}

export const LineupManagerModal: React.FC<LineupManagerModalProps> = ({
  isOpen,
  onClose,
  currentFestival,
  onUpdateFestival,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'paste_text' | 'upload_csv'>('presets');
  const [rawScheduleText, setRawScheduleText] = useState('');
  const [festivalNameHint, setFestivalNameHint] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle parsing pasted CSV / spreadsheet timetable data (same as pasting ratings)
  const handleParsePastedSchedule = () => {
    if (!rawScheduleText.trim()) {
      setErrorMsg('Please paste timetable CSV or spreadsheet cells.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const festivalName = festivalNameHint.trim() || 'Custom Festival Lineup';
      const parsedFestival = parseFestivalCsv(rawScheduleText, festivalName, 'paste_csv');

      if (!parsedFestival.sets || parsedFestival.sets.length === 0) {
        setErrorMsg(
          'No valid timetable sets detected in pasted data. Please check that columns contain Artist/Act, Stage/Venue, and Start/End times (e.g. Stage, Act, Start, End, Day).'
        );
        return;
      }

      onUpdateFestival(parsedFestival);
      setSuccessMsg(
        `Successfully imported ${parsedFestival.sets.length} sets across ${parsedFestival.stages.length} stages and ${parsedFestival.days.length} days for "${parsedFestival.name}"!`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse pasted timetable CSV. Please check formatting.');
    }
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseFestivalCsv(text, file.name.replace(/\.[^/.]+$/, ''), 'upload');
        onUpdateFestival(parsed);
        setSuccessMsg(`Imported ${parsed.sets.length} sets from ${file.name}!`);
      }
    };
    reader.readAsText(file);
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: FestivalData) => {
    onUpdateFestival(preset);
    setSuccessMsg(`Loaded preset: "${preset.name}" (${preset.sets.length} sets across ${preset.stages.length} stages)`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div
        id="lineup-manager-modal"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Festival Timetable & Lineup Source</h2>
              <p className="text-xs text-slate-400">
                Load full timetables from presets, paste CSV or spreadsheet timetable data, or upload files.
              </p>
            </div>
          </div>
          <button
            id="btn-close-lineup-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 flex flex-wrap items-center gap-2 bg-slate-950/40">
          <button
            id="tab-presets"
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'presets' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Festival Presets</span>
          </button>
          <button
            id="tab-paste-text"
            type="button"
            onClick={() => setActiveTab('paste_text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'paste_text' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste Schedule CSV</span>
          </button>
          <button
            id="tab-upload-csv"
            type="button"
            onClick={() => setActiveTab('upload_csv')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'upload_csv' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Lineup Notice</p>
                <p className="mt-0.5 text-rose-300">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Success</p>
                <p className="mt-0.5 text-emerald-300">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Presets Tab */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Choose a pre-loaded festival with complete multi-stage timetables and realistic schedule timings:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SAMPLE_FESTIVALS.map((f) => (
                  <div
                    key={f.name}
                    id={`festival-card-${f.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      currentFestival.name === f.name
                        ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/40'
                        : 'bg-slate-800/80 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-bold text-white">{f.name}</h3>
                        {currentFestival.name === f.name && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{f.location}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                        <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700/60">
                          📅 {f.days.length} Days
                        </span>
                        <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700/60">
                          🎪 {f.stages.length} Stages
                        </span>
                        <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700/60">
                          🎸 {f.sets.length} Sets
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset(f)}
                      className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-semibold transition ${
                        currentFestival.name === f.name
                          ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                      }`}
                    >
                      {currentFestival.name === f.name ? 'Currently Active' : 'Load Festival Timetable'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paste Schedule CSV Tab */}
          {activeTab === 'paste_text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Festival Name (Optional)
                </label>
                <input
                  type="text"
                  value={festivalNameHint}
                  onChange={(e) => setFestivalNameHint(e.target.value)}
                  placeholder="e.g. Glastonbury 2026, All Points East, Primavera Sound"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-3"
                />
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Paste Spreadsheet Cells or CSV Timetable
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Supports Google Sheets, Excel, & CSV
                  </span>
                </div>
                <textarea
                  id="textarea-pasted-schedule"
                  rows={7}
                  value={rawScheduleText}
                  onChange={(e) => setRawScheduleText(e.target.value)}
                  placeholder={`Venue, Act, Start, End, Day\nPyramid Stage, Dua Lipa, 22:00, 23:45, Friday\nPyramid Stage, LCD Soundsystem, 19:45, 21:00, Friday\nOther Stage, Idles, 22:30, 23:45, Friday\nOther Stage, Fontaines D.C., 20:30, 21:30, Friday\nWest Holts, Michael Kiwanuka, 21:30, 23:00, Friday`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-lg">
                  Copy & paste columns directly from Google Sheets, Excel, or CSV files. Columns for Stage/Venue, Artist/Act, Start, End, and Day are recognized automatically.
                </p>
                <button
                  id="btn-extract-text-schedule"
                  type="button"
                  onClick={handleParsePastedSchedule}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm shrink-0"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Parse Schedule CSV</span>
                </button>
              </div>

              {/* Parsed Preview if available */}
              {currentFestival.sourceType === 'paste_csv' && currentFestival.sets.length > 0 && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400">
                      Current Lineup: {currentFestival.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentFestival.sets.length} sets • {currentFestival.stages.length} stages • {currentFestival.days.length} days
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-slate-800/80 rounded-lg">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-1 px-2.5">Artist / Act</th>
                          <th className="py-1 px-2.5">Stage</th>
                          <th className="py-1 px-2.5">Day</th>
                          <th className="py-1 px-2.5">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                        {currentFestival.sets.slice(0, 6).map((set) => (
                          <tr key={set.id} className="hover:bg-slate-900/50">
                            <td className="py-1 px-2.5 font-sans font-medium text-white">{set.artist}</td>
                            <td className="py-1 px-2.5 text-slate-400">{set.stage}</td>
                            <td className="py-1 px-2.5 text-slate-400">{set.dayName}</td>
                            <td className="py-1 px-2.5 text-amber-300/90">{set.startTime} - {set.endTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {currentFestival.sets.length > 6 && (
                    <p className="text-[10px] text-slate-500 text-right">
                      + {currentFestival.sets.length - 6} more sets loaded
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload CSV Tab */}
          {activeTab === 'upload_csv' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Upload Timetable File (CSV, TSV, JSON)
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 rounded-2xl p-8 text-center transition bg-slate-950/40">
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">Upload a CSV, TSV, or JSON timetable file</p>
                <input
                  id="file-input-lineup"
                  type="file"
                  accept=".csv,.tsv,.json"
                  onChange={handleFileUpload}
                  className="mt-4 block mx-auto text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Active: <span className="font-semibold text-white">{currentFestival.name}</span> ({currentFestival.sets.length} sets)
          </div>
          <button
            id="btn-apply-lineup"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
