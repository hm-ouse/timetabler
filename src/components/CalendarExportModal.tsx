import React, { useState } from 'react';
import {
  CalendarCheck2,
  Download,
  Calendar,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { MatchedScheduleItem, FestivalData } from '../types';
import { downloadIcsFile, exportScheduleCsv } from '../utils/calendarExport';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MatchedScheduleItem[];
  festival: FestivalData;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  items,
  festival,
}) => {
  const [downloadedIcs, setDownloadedIcs] = useState(false);
  const [downloadedCsv, setDownloadedCsv] = useState(false);

  if (!isOpen) return null;

  const attendingItems = items
    .filter((item) => item.status !== 'skipped')
    .sort((a, b) => {
      if (a.set.dayId !== b.set.dayId) return a.set.dayId.localeCompare(b.set.dayId);
      return a.set.startTime.localeCompare(b.set.startTime);
    });

  const handleDownloadIcs = () => {
    downloadIcsFile(attendingItems, festival);
    setDownloadedIcs(true);
    setTimeout(() => setDownloadedIcs(false), 3000);
  };

  const handleDownloadCsv = () => {
    exportScheduleCsv(attendingItems, festival);
    setDownloadedCsv(true);
    setTimeout(() => setDownloadedCsv(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div
        id="calendar-export-modal"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export Festival Schedule</h2>
              <p className="text-xs text-slate-400">
                Sync {attendingItems.length} selected performances to your phone or desktop calendar
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Main 2 Export Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* iCalendar (.ics) Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">iCalendar (.ics)</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Compatible with Apple Calendar (iOS/macOS), Google Calendar, Outlook, and phone widgets. Includes 15-minute stage change alarms.
                </p>
              </div>

              <button
                id="btn-download-ics"
                type="button"
                onClick={handleDownloadIcs}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>{downloadedIcs ? 'Downloaded!' : 'Download .ics Calendar'}</span>
              </button>
            </div>

            {/* CSV Spreadsheet Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                  <h3 className="font-bold text-sm text-white">Timetable CSV</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Clean tabular export with artists, stages, ratings %, review notes, and times for Excel or Google Sheets.
                </p>
              </div>

              <button
                id="btn-download-csv"
                type="button"
                onClick={handleDownloadCsv}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>{downloadedCsv ? 'Downloaded!' : 'Download Schedule CSV'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
