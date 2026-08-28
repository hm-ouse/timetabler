import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileCode,
  ShieldCheck,
  HardDrive,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import {
  getStorageDiagnostics,
  validateAndCleanStorage,
  resetAllStorageData,
  exportAllDataJson,
  importAllDataJson,
  StorageDiagnostics,
} from '../utils/storageManager';
import { FestivalData, UserRating, AttendanceStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: () => void;
  onRestoreBackup: (backup: {
    festival?: FestivalData;
    ratings?: UserRating[];
    rawCsv?: string;
    statusOverrides?: Record<string, AttendanceStatus>;
  }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetComplete,
  onRestoreBackup,
}) => {
  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportArea, setShowImportArea] = useState<boolean>(false);

  const refreshDiagnostics = () => {
    const diag = getStorageDiagnostics();
    setDiagnostics(diag);
  };

  useEffect(() => {
    if (isOpen) {
      refreshDiagnostics();
      setConfirmReset(false);
      setStatusMessage(null);
      setShowImportArea(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValidateAndRepair = () => {
    const result = validateAndCleanStorage();
    refreshDiagnostics();
    if (result.cleanedKeys.length > 0 || result.repaired) {
      setStatusMessage({
        type: 'info',
        text: `Storage repaired: Cleaned ${result.cleanedKeys.length} stale items.`,
      });
    } else {
      setStatusMessage({
        type: 'success',
        text: 'Storage validation complete: All keys and data schemas are 100% healthy.',
      });
    }
  };

  const handleResetAll = () => {
    resetAllStorageData();
    refreshDiagnostics();
    setConfirmReset(false);
    setStatusMessage({
      type: 'success',
      text: 'All local data has been wiped. App reset to clean default state.',
    });
    setTimeout(() => {
      onResetComplete();
      onClose();
    }, 800);
  };

  const handleExportBackup = () => {
    try {
      const jsonStr = exportAllDataJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetabler_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: 'Backup exported successfully as JSON.',
      });
    } catch (e) {
      setStatusMessage({
        type: 'error',
        text: `Failed to export backup: ${String(e)}`,
      });
    }
  };

  const handleImportBackup = () => {
    if (!importJsonText.trim()) return;
    const result = importAllDataJson(importJsonText);
    if (result.success) {
      setStatusMessage({
        type: 'success',
        text: 'Backup restored successfully! All custom lineups, ratings, and attendance data updated.',
      });
      refreshDiagnostics();
      onRestoreBackup({
        festival: result.festival,
        ratings: result.ratings,
        rawCsv: result.rawCsv,
        statusOverrides: result.statusOverrides,
      });
      setShowImportArea(false);
      setImportJsonText('');
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Failed to restore backup.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJsonText(content);
        const result = importAllDataJson(content);
        if (result.success) {
          setStatusMessage({
            type: 'success',
            text: `Restored backup from "${file.name}"!`,
          });
          refreshDiagnostics();
          onRestoreBackup({
            festival: result.festival,
            ratings: result.ratings,
            rawCsv: result.rawCsv,
            statusOverrides: result.statusOverrides,
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: result.error || 'Failed to parse JSON file.',
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="settings-storage-modal"
        className="w-full max-w-xl bg-[#161420] border border-[#2a253d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#262137] flex items-center justify-between bg-[#110f1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Settings & Storage Diagnostics
              </h3>
              <p className="text-[11px] text-[#8e88a3]">
                Manage offline persistence, validate data integrity, and reset state
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8e88a3] hover:text-white hover:bg-[#252136] rounded-lg transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  : 'bg-indigo-950/50 border-indigo-500/40 text-indigo-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight">{statusMessage.text}</span>
            </div>
          )}

          {/* Storage Overview Card */}
          <div className="p-4 rounded-xl bg-[#100e18] border border-[#252136] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9d97b0] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>LocalStorage Health & Metrics</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{diagnostics?.isValid ? 'Healthy' : 'Needs Repair'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-[#181524] border border-[#2d283e]">
                <p className="text-[10px] text-[#7c768e]">Storage Used</p>
                <p className="text-sm font-mono font-bold text-white mt-0.5">
                  {diagnostics ? formatBytes(diagnostics.totalBytes) : '0 KB'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#181524] border border-[#2d283e]">
                <p className="text-[10px] text-[#7c768e]">Rated Bands</p>
                <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                  {diagnostics?.savedRatingsCount ?? 0}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#181524] border border-[#2d283e]">
                <p className="text-[10px] text-[#7c768e]">Festival Sets</p>
                <p className="text-sm font-mono font-bold text-indigo-300 mt-0.5">
                  {diagnostics?.savedSetsCount ?? 0}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#181524] border border-[#2d283e]">
                <p className="text-[10px] text-[#7c768e]">Marked Acts</p>
                <p className="text-sm font-mono font-bold text-amber-300 mt-0.5">
                  {diagnostics?.savedStatusOverridesCount ?? 0}
                </p>
              </div>
            </div>

            {diagnostics?.savedFestivalName && (
              <p className="text-[11px] text-[#8e88a3] flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-[#6f6980]" />
                <span>Saved Lineup:</span>
                <span className="font-semibold text-[#e2deec] truncate">{diagnostics.savedFestivalName}</span>
              </p>
            )}
          </div>

          {/* Backup & Portability Actions */}
          <div className="p-4 rounded-xl bg-[#100e18] border border-[#252136] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9d97b0] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Backup & Data Transfer</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-3 rounded-xl bg-[#1e1b2b] hover:bg-[#282338] border border-[#322d4a] text-white flex items-center gap-2.5 transition font-medium text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-xs">Export All App Data</p>
                  <p className="text-[10px] text-[#8e88a3]">Save backup .json file</p>
                </div>
              </button>

              <label className="p-3 rounded-xl bg-[#1e1b2b] hover:bg-[#282338] border border-[#322d4a] text-white flex items-center gap-2.5 transition font-medium cursor-pointer text-left">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-xs">Restore from File</p>
                  <p className="text-[10px] text-[#8e88a3]">Upload backup .json</p>
                </div>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Validate & Repair Storage button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleValidateAndRepair}
                className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5 font-medium transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Verify & Repair Schema Keys</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Reset All Data */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Factory Reset & Clean State</span>
              </span>
            </div>

            <p className="text-[11px] text-[#b5b0c4]">
              Clears all cached ratings, custom imported festival schedules, and attendance overrides from this browser.
            </p>

            {!confirmReset ? (
              <button
                id="btn-reset-all-data"
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset All Data</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/60 space-y-2.5 animate-in fade-in duration-100">
                <p className="text-xs font-bold text-rose-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Are you sure? This action cannot be undone.</span>
                </p>
                <p className="text-[11px] text-rose-200">
                  All your custom ratings, imported festival stages, and marked bands will be removed.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    id="btn-confirm-reset-all"
                    type="button"
                    onClick={handleResetAll}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
                  >
                    Yes, Reset Everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#252136] hover:bg-[#322d4a] text-[#b5b0c4] font-medium text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#262137] bg-[#110f1a] flex items-center justify-between text-xs text-[#7c768e]">
          <span>timetabler Client • Offline Ready</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252136] hover:bg-[#322d4a] text-white rounded-xl font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
