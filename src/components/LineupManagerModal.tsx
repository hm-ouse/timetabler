import React, { useState } from 'react';
import {
  Sparkles,
  Globe,
  Upload,
  Layers,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  Calendar,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { FestivalData, FestivalSet } from '../types';
import { parseClashfinderCsv, formatTime24h } from '../utils/clashfinderParser';
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
  const [activeTab, setActiveTab] = useState<'clashfinder' | 'ai_web' | 'paste_text' | 'upload_csv' | 'presets'>('presets');
  const [clashfinderUrl, setClashfinderUrl] = useState('');
  const [webQuery, setWebQuery] = useState('');
  const [rawScheduleText, setRawScheduleText] = useState('');
  const [festivalNameHint, setFestivalNameHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Clashfinder fetch
  const handleFetchClashfinder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clashfinderUrl.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/fetch-clashfinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clashfinderUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse Clashfinder URL');
      }

      let newFestival: FestivalData;
      if (data.format === 'csv') {
        newFestival = parseClashfinderCsv(data.data, 'Clashfinder Festival');
        newFestival.sourceUrl = clashfinderUrl;
      } else if (data.format === 'structured') {
        const d = data.data;
        newFestival = {
          name: d.festivalName || 'Clashfinder Festival',
          days: d.days || [{ id: 'day-1', name: 'Day 1' }],
          stages: d.stages || ['Main Stage'],
          sets: (d.sets || []).map((s: any, idx: number) => ({
            id: `cf-set-${idx + 1}`,
            artist: s.artist,
            stage: s.stage,
            dayId: s.day.toLowerCase().replace(/[^\w]/g, '-') || 'day-1',
            dayName: s.day,
            startTime: formatTime24h(s.startTime),
            endTime: formatTime24h(s.endTime),
            description: s.notes,
          })),
          sourceUrl: clashfinderUrl,
          sourceType: 'clashfinder',
        };
      } else {
        throw new Error('Unrecognized response format from Clashfinder');
      }

      onUpdateFestival(newFestival);
      setSuccessMsg(`Successfully imported ${newFestival.sets.length} sets across ${newFestival.stages.length} stages from Clashfinder!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not fetch Clashfinder. You can also paste the CSV or timetable text.');
    } finally {
      setLoading(false);
    }
  };

  // Handle AI Web Scraping / Search
  const handleScrapeWeb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webQuery.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const isUrl = webQuery.startsWith('http://') || webQuery.startsWith('https://');
      const response = await fetch('/api/scrape-festival-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: isUrl ? undefined : webQuery,
          festivalUrl: isUrl ? webQuery : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract lineup');
      }

      const s = data.schedule;
      const newFestival: FestivalData = {
        name: s.festivalName || webQuery,
        location: s.location,
        year: s.year,
        days: s.days || [{ id: 'day-1', name: 'Day 1' }],
        stages: s.stages || ['Main Stage'],
        sets: (s.sets || []).map((set: any, idx: number) => ({
          id: `ai-set-${idx + 1}`,
          artist: set.artist,
          stage: set.stage,
          dayId: (set.day || 'day-1').toLowerCase().replace(/[^\w]/g, '-'),
          dayName: set.day || 'Day 1',
          startTime: formatTime24h(set.startTime),
          endTime: formatTime24h(set.endTime),
          description: set.description,
        })),
        sourceType: 'web_scrape',
      };

      onUpdateFestival(newFestival);
      setSuccessMsg(`Found and extracted ${newFestival.sets.length} timetable sets for "${newFestival.name}"!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not find schedule. Try entering the Clashfinder URL or pasting the schedule text.');
    } finally {
      setLoading(false);
    }
  };

  // Handle AI Text extraction from pasted timetable
  const handleExtractTextSchedule = async () => {
    if (!rawScheduleText.trim()) {
      setErrorMsg('Please paste the timetable text.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/ai-extract-text-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawScheduleText,
          festivalNameHint: festivalNameHint || 'Custom Festival',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract timetable');
      }

      const s = data.schedule;
      const newFestival: FestivalData = {
        name: s.festivalName || festivalNameHint || 'Custom Festival',
        days: s.days || [{ id: 'day-1', name: 'Day 1' }],
        stages: s.stages || ['Main Stage'],
        sets: (s.sets || []).map((set: any, idx: number) => ({
          id: `txt-set-${idx + 1}`,
          artist: set.artist,
          stage: set.stage,
          dayId: (set.day || 'day-1').toLowerCase().replace(/[^\w]/g, '-'),
          dayName: set.day || 'Day 1',
          startTime: formatTime24h(set.startTime),
          endTime: formatTime24h(set.endTime),
          description: set.notes,
        })),
        sourceType: 'ai_text',
      };

      onUpdateFestival(newFestival);
      setSuccessMsg(`Extracted ${newFestival.sets.length} sets from pasted timetable!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse text schedule.');
    } finally {
      setLoading(false);
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
        const parsed = parseClashfinderCsv(text, file.name.replace(/\.[^/.]+$/, ''));
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
                Load full timetables from Clashfinder.com, scrape the web with AI, upload CSVs, or choose a preset.
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
            id="tab-clashfinder"
            type="button"
            onClick={() => setActiveTab('clashfinder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'clashfinder' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Clashfinder.com</span>
          </button>
          <button
            id="tab-ai-web"
            type="button"
            onClick={() => setActiveTab('ai_web')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'ai_web' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Web Scraper / AI Search</span>
          </button>
          <button
            id="tab-paste-text"
            type="button"
            onClick={() => setActiveTab('paste_text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'paste_text' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Schedule Text</span>
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

          {/* Clashfinder Tab */}
          {activeTab === 'clashfinder' && (
            <form onSubmit={handleFetchClashfinder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Clashfinder URL or Event Identifier
                </label>
                <div className="flex gap-2">
                  <input
                    id="input-clashfinder-url"
                    type="text"
                    value={clashfinderUrl}
                    onChange={(e) => setClashfinderUrl(e.target.value)}
                    placeholder="https://clashfinder.com/s/glasto2024/ or glasto2024"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    id="btn-fetch-clashfinder"
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{loading ? 'Importing...' : 'Fetch Clashfinder'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">How Clashfinder integration works:</span>
                  <a
                    href="https://clashfinder.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Browse clashfinder.com <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p>
                  Paste any Clashfinder URL or event slug. The app will parse all stages, day breakdowns, set start times, and finish times into your personalized planner.
                </p>
              </div>
            </form>
          )}

          {/* AI Web Scraping / Search Tab */}
          {activeTab === 'ai_web' && (
            <form onSubmit={handleScrapeWeb} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Festival Name or Official Schedule Webpage URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="input-web-query"
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    placeholder="e.g. Primavera Sound 2026 set times or https://readingfestival.com/lineup/"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    id="btn-scrape-web"
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{loading ? 'Searching...' : 'AI Web Scrape'}</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Powered by Gemini 3.7 with live web search grounding to look up full lineups, stages, and set times.
              </p>
            </form>
          )}

          {/* Paste Schedule Text Tab */}
          {activeTab === 'paste_text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Festival Name
                </label>
                <input
                  type="text"
                  value={festivalNameHint}
                  onChange={(e) => setFestivalNameHint(e.target.value)}
                  placeholder="e.g. All Points East 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white mb-2"
                />
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Paste Lineup / Timetable Text (from poster, website, or social media)
                </label>
                <textarea
                  id="textarea-pasted-schedule"
                  rows={6}
                  value={rawScheduleText}
                  onChange={(e) => setRawScheduleText(e.target.value)}
                  placeholder={`Friday - Main Stage\n14:00 - 15:00 The Last Dinner Party\n16:00 - 17:15 Michael Kiwanuka\n19:45 - 21:00 LCD Soundsystem\n22:00 - 23:45 Dua Lipa\n\nFriday - Other Stage\n17:00 - 18:00 Yard Act\n20:30 - 21:30 Fontaines D.C.\n22:30 - 23:45 Idles`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  id="btn-extract-text-schedule"
                  type="button"
                  onClick={handleExtractTextSchedule}
                  disabled={loading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Extract Schedule</span>
                </button>
              </div>
            </div>
          )}

          {/* Upload CSV Tab */}
          {activeTab === 'upload_csv' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Upload Clashfinder CSV or Timetable File
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 rounded-2xl p-8 text-center transition bg-slate-950/40">
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">Upload a Clashfinder CSV, JSON, or standard timetable file</p>
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
