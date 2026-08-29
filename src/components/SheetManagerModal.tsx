import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Link2,
  Upload,
  ClipboardPaste,
  Sparkles,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Scale,
  RefreshCw,
  X,
  Layers,
  User,
  Users,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { UserRating, SheetParseResult, RatingScaleType, SheetTabInfo } from '../types';
import { parseSheetContent, parseExcelWorkbook } from '../utils/sheetParser';

interface SafeFetchResult {
  ok: boolean;
  status: number;
  data: any;
  rawText: string;
  isHtml: boolean;
  error?: string;
}

async function safeFetchJson(url: string, options?: RequestInit): Promise<SafeFetchResult> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    const trimmed = rawText.trim();
    const lower = trimmed.toLowerCase();

    // Check if body is HTML (e.g. login page, 404, or proxy error)
    const isHtml =
      contentType.includes('text/html') ||
      lower.startsWith('<!doctype') ||
      lower.startsWith('<html') ||
      (trimmed.startsWith('<') && lower.includes('</html>'));

    let data: any = null;
    if (!isHtml && trimmed.length > 0) {
      try {
        data = JSON.parse(rawText);
      } catch {
        // Not valid JSON - safely ignored
      }
    }

    const isLogin =
      isHtml &&
      (trimmed.includes('accounts.google.com') ||
        trimmed.includes('ServiceLogin') ||
        trimmed.includes('Sign in') ||
        trimmed.includes('drive.google.com') ||
        trimmed.includes('Access Denied'));

    const isSuccess = response.ok && data !== null && !data.error && data.ok !== false;
    const friendlyError =
      data?.error ||
      (isLogin
        ? 'This Google Sheet is private or requires Google login. In Google Sheets, click "Share" (top-right) and set access to "Anyone with the link can view", or copy & paste the spreadsheet cells directly.'
        : isHtml
        ? 'Received an HTML webpage instead of spreadsheet data. Please ensure the Google Sheet link is shared with "Anyone with the link can view", or copy and paste the spreadsheet cells directly.'
        : undefined);

    return {
      ok: isSuccess,
      status: response.status,
      data,
      rawText,
      isHtml,
      error: friendlyError,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      rawText: '',
      isHtml: false,
      error: err.message || 'Request failed',
    };
  }
}

async function fetchGoogleSheetCsvClient(
  url: string,
  targetGid: string = '0',
  sheetName?: string
): Promise<{ csv: string; source: string; isHtml: boolean; isLogin: boolean; error?: string }> {
  let cleanUrl = (url || '').trim().replace(/^["'<]+|["'>]+$/g, '');
  const publishedMatch = cleanUrl.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  const standardMatch = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,})/);
  const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
  const effectiveGid = targetGid || (gidMatch ? gidMatch[1] : '0');

  // Handle published Google Sheet links (/d/e/{ID}/pubhtml or /pub)
  if (publishedMatch || cleanUrl.includes('/pubhtml') || cleanUrl.includes('/pub')) {
    const pubUrls: string[] = [];
    if (publishedMatch) {
      pubUrls.push(
        `https://docs.google.com/spreadsheets/d/e/${publishedMatch[1]}/pub?output=csv&gid=${effectiveGid}`
      );
    }
    if (cleanUrl.includes('/pubhtml')) {
      pubUrls.push(cleanUrl.replace('/pubhtml', `/pub?output=csv&gid=${effectiveGid}`));
    } else if (cleanUrl.includes('/pub')) {
      const base = cleanUrl.split('?')[0];
      pubUrls.push(`${base}?output=csv&gid=${effectiveGid}`);
    }

    for (const pubCsvUrl of pubUrls) {
      try {
        const res = await fetch(pubCsvUrl);
        if (res.ok) {
          const text = await res.text();
          const trimmed = text.trim();
          const lower = trimmed.toLowerCase();
          const isHtml =
            lower.startsWith('<!doctype') ||
            lower.startsWith('<html') ||
            (trimmed.startsWith('<') && lower.includes('</html>'));
          const isLogin =
            isHtml &&
            (trimmed.includes('accounts.google.com') ||
              trimmed.includes('ServiceLogin') ||
              trimmed.includes('Sign in') ||
              trimmed.includes('drive.google.com') ||
              trimmed.includes('Access Denied'));

          if (!isHtml && trimmed.length > 0) {
            return { csv: text, source: pubCsvUrl, isHtml: false, isLogin: false };
          }
          if (isLogin) {
            return { csv: '', source: pubCsvUrl, isHtml: true, isLogin: true };
          }
        }
      } catch (err: any) {
        console.warn('Direct client pub fetch failed:', err);
      }
    }
  }

  if (!standardMatch) {
    return {
      csv: '',
      source: cleanUrl,
      isHtml: false,
      isLogin: false,
      error: 'Invalid Google Sheet URL. Please ensure it contains docs.google.com/spreadsheets/d/...',
    };
  }

  const sheetId = standardMatch[1];
  const candidateUrls: string[] = [];

  if (sheetName && sheetName !== 'Main Sheet') {
    candidateUrls.push(
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
    );
  }
  candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${effectiveGid}`);
  candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${effectiveGid}`);

  let lastError = '';
  let encounteredHtml = false;
  let encounteredLogin = false;

  for (const directUrl of candidateUrls) {
    try {
      const res = await fetch(directUrl);
      if (res.ok) {
        const text = await res.text();
        const trimmed = text.trim();
        const lower = trimmed.toLowerCase();
        const isHtml =
          lower.startsWith('<!doctype') ||
          lower.startsWith('<html') ||
          (trimmed.startsWith('<') && lower.includes('</html>'));

        if (isHtml) {
          encounteredHtml = true;
          if (
            trimmed.includes('accounts.google.com') ||
            trimmed.includes('ServiceLogin') ||
            trimmed.includes('Sign in') ||
            trimmed.includes('drive.google.com') ||
            trimmed.includes('Access Denied')
          ) {
            encounteredLogin = true;
          }
          continue;
        }

        if (trimmed.length > 0) {
          return { csv: text, source: directUrl, isHtml: false, isLogin: false };
        }
      } else {
        lastError = `Google responded with status ${res.status}`;
      }
    } catch (err: any) {
      lastError = err.message || 'Direct fetch failed';
    }
  }

  return {
    csv: '',
    source: candidateUrls[0] || cleanUrl,
    isHtml: encounteredHtml,
    isLogin: encounteredLogin,
    error: encounteredLogin
      ? 'The Google Sheet is private or requires Google login.'
      : lastError || 'Could not fetch spreadsheet data from Google Sheets.',
  };
}

interface SheetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratings: UserRating[];
  sheetMeta?: SheetParseResult;
  onUpdateRatings: (newRatings: UserRating[], meta: SheetParseResult, rawCsv: string) => void;
  currentRawCsv: string;
}

export const SheetManagerModal: React.FC<SheetManagerModalProps> = ({
  isOpen,
  onClose,
  ratings,
  sheetMeta,
  onUpdateRatings,
  currentRawCsv,
}) => {
  const [activeTab, setActiveTab] = useState<'google_sheet' | 'upload' | 'paste'>('google_sheet');
  const [googleSheetUrl, setGoogleSheetUrl] = useState(sheetMeta?.sourceUrl || '');
  const [pastedText, setPastedText] = useState(currentRawCsv || '');
  const [scaleOverride, setScaleOverride] = useState<RatingScaleType>('auto');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<SheetParseResult | null>(sheetMeta || null);

  // Multi-tab state
  const [availableTabs, setAvailableTabs] = useState<SheetTabInfo[]>(sheetMeta?.availableTabs || []);
  const [selectedTabGid, setSelectedTabGid] = useState<string>(sheetMeta?.activeTabGid || '0');
  const [selectedTabName, setSelectedTabName] = useState<string>(sheetMeta?.activeTabName || 'Main Sheet');
  const [googleSheetsMap, setGoogleSheetsMap] = useState<Record<string, string>>({});
  const [excelSheetsMap, setExcelSheetsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sheetMeta) {
      setPreviewResult(sheetMeta);
      if (sheetMeta.availableTabs && sheetMeta.availableTabs.length > 0) {
        setAvailableTabs(sheetMeta.availableTabs);
      }
      if (sheetMeta.activeTabName) {
        setSelectedTabName(sheetMeta.activeTabName);
      }
      if (sheetMeta.activeTabGid) {
        setSelectedTabGid(sheetMeta.activeTabGid);
      }
      if (sheetMeta.sourceUrl) {
        setGoogleSheetUrl(sheetMeta.sourceUrl);
      }
    }
  }, [sheetMeta, isOpen]);

  if (!isOpen) return null;

  // Handle direct Google Sheet Tab switch with caching
  const handleSelectGoogleTab = async (tab: SheetTabInfo) => {
    setSelectedTabName(tab.name);
    setSelectedTabGid(tab.gid || '0');

    // Check if we already have the CSV cached for this tab
    const cachedCsv = googleSheetsMap[tab.name] || tab.csvContent;
    if (cachedCsv) {
      setPastedText(cachedCsv);
      const parsed = parseSheetContent(cachedCsv, scaleOverride, {
        activeTabName: tab.name,
        activeTabGid: tab.gid,
        availableTabs,
        sourceUrl: googleSheetUrl,
        sourceType: 'google_sheet',
      });
      setPreviewResult(parsed);
      onUpdateRatings(parsed.ratings, parsed, cachedCsv);
      if (parsed.validRatingsCount > 0) {
        setSuccessMsg(`Switched to tab: "${tab.name}" — Loaded ${parsed.validRatingsCount} ratings!`);
      } else {
        setSuccessMsg(`Loaded tab "${tab.name}" (${parsed.totalRows} rows). No numeric ratings detected in score column.`);
      }
      return;
    }

    // Otherwise fetch from server
    handleFetchGoogleSheet(undefined, tab.gid, tab.name);
  };

  // Handle Google Sheet URL fetch via server endpoint or client-side fallback
  const handleFetchGoogleSheet = async (e?: React.FormEvent, customGid?: string, customName?: string) => {
    if (e) e.preventDefault();
    const cleanUrl = googleSheetUrl.trim();
    if (!cleanUrl) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetGid = customGid !== undefined ? customGid : selectedTabGid;
    const targetName = customName !== undefined ? customName : selectedTabName;

    try {
      let csvContent = '';
      let detectedTabs: SheetTabInfo[] = [];
      let activeTabInfo: { gid?: string; name?: string } = { gid: targetGid, name: targetName || 'Main Sheet' };
      let fetchedSuccessfully = false;

      // 1. Try server backend endpoint first (with safe JSON parser to avoid "unexpected token <")
      const serverResult = await safeFetchJson('/api/fetch-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          gid: targetGid,
          sheetName: targetName !== 'Main Sheet' ? targetName : undefined,
        }),
      });

      if (serverResult.ok && serverResult.data?.csv) {
        const candidateCsv = serverResult.data.csv;
        const isHtml =
          candidateCsv.trim().startsWith('<!DOCTYPE') ||
          candidateCsv.trim().startsWith('<html') ||
          (candidateCsv.trim().startsWith('<') && candidateCsv.toLowerCase().includes('</html>'));

        if (!isHtml) {
          csvContent = candidateCsv;
          fetchedSuccessfully = true;
          if (serverResult.data.sheetsCsv) {
            setGoogleSheetsMap(serverResult.data.sheetsCsv);
          }
          if (serverResult.data.availableTabs && serverResult.data.availableTabs.length > 0) {
            detectedTabs = serverResult.data.availableTabs;
          }
          if (serverResult.data.activeTab) {
            activeTabInfo = serverResult.data.activeTab;
          }
        }
      }

      // 2. If server endpoint failed, returned HTML, or is unavailable, fallback to client-side direct fetch!
      if (!fetchedSuccessfully) {
        const clientResult = await fetchGoogleSheetCsvClient(cleanUrl, targetGid, targetName);
        if (clientResult.csv && !clientResult.isHtml) {
          csvContent = clientResult.csv;
          fetchedSuccessfully = true;
        } else if (
          clientResult.isLogin ||
          (serverResult.data?.error && serverResult.data.error.includes('private')) ||
          (serverResult.data?.error && serverResult.data.error.includes('login'))
        ) {
          throw new Error(
            'This Google Sheet is private or requires Google login. In Google Sheets, click "Share" (top-right), set access to "Anyone with the link can view", or copy the sheet cells and paste them into the "Paste Sheet" tab.'
          );
        } else if (serverResult.data?.error) {
          throw new Error(serverResult.data.error);
        } else if (clientResult.error) {
          throw new Error(clientResult.error);
        } else {
          throw new Error(
            'Could not load spreadsheet data. Make sure the Google Sheet is shared with "Anyone with the link can view", or copy & paste the cells directly.'
          );
        }
      }

      // We have CSV content!
      setPastedText(csvContent);

      if (detectedTabs.length === 0) {
        detectedTabs = [{ id: targetGid, name: targetName || 'Main Sheet', gid: targetGid, isDefault: true }];
      }

      setAvailableTabs(detectedTabs);
      setSelectedTabGid(activeTabInfo.gid || targetGid);
      setSelectedTabName(activeTabInfo.name || targetName);

      const parsed = parseSheetContent(csvContent, scaleOverride, {
        activeTabName: activeTabInfo.name,
        activeTabGid: activeTabInfo.gid,
        availableTabs: detectedTabs,
        sourceUrl: cleanUrl,
        sourceType: 'google_sheet',
      });

      if (parsed.error || parsed.warning) {
        if (parsed.validRatingsCount === 0) {
          setErrorMsg(parsed.error || parsed.warning || 'Could not detect ratings in sheet.');
          setPreviewResult(parsed);
          return;
        }
      }

      setPreviewResult(parsed);
      onUpdateRatings(parsed.ratings, parsed, csvContent);

      if (parsed.validRatingsCount > 0) {
        setSuccessMsg(
          `Imported ${parsed.validRatingsCount} ratings from "${activeTabInfo.name}" (${detectedTabs.length} tabs found: ${detectedTabs.map((t) => t.name).join(', ')})`
        );
      } else {
        const otherTabs = detectedTabs.filter((t) => t.name !== activeTabInfo.name);
        setSuccessMsg(
          `Loaded tab "${activeTabInfo.name}" (${parsed.totalRows} rows). ${
            otherTabs.length > 0
              ? `Available tabs: ${detectedTabs.map((t) => t.name).join(', ')} — click any tab below to switch!`
              : 'Tip: Ensure the sheet has artist names and rating columns.'
          }`
        );
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.includes('Unexpected token') ||
        msg.includes('is not valid JSON') ||
        msg.includes('<html>') ||
        msg.includes('<!DOCTYPE') ||
        msg.includes('HTML page')
      ) {
        setErrorMsg(
          'Could not load data from Google Sheets: the sheet may be private or protected. In Google Sheets, click "Share" (top-right) and set access to "Anyone with the link can view", or copy and paste the spreadsheet cells into the "Paste Sheet" tab.'
        );
      } else {
        setErrorMsg(
          msg ||
            'Could not fetch Google Sheet. Please check that the sheet is shared with "Anyone with the link can view", or copy and paste the spreadsheet cells directly.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Inspect Google Sheet Tabs without downloading full content
  const handleDiscoverGoogleSheetTabs = async () => {
    const cleanUrl = googleSheetUrl.trim();
    if (!cleanUrl) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const serverResult = await safeFetchJson('/api/list-google-sheet-tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });

      if (serverResult.ok && serverResult.data) {
        const data = serverResult.data;
        if (data.sheetsCsv) {
          setGoogleSheetsMap(data.sheetsCsv);
        }

        if (data.tabs && data.tabs.length > 0) {
          setAvailableTabs(data.tabs);
          setSuccessMsg(
            `Discovered ${data.tabs.length} tabs in "${data.title || 'Google Sheet'}": ${data.tabs
              .map((t: SheetTabInfo) => `"${t.name}"`)
              .join(', ')}. Click a tab below to switch!`
          );
          return;
        }
      }

      if (serverResult.data?.error) {
        setErrorMsg(serverResult.data.error);
      } else {
        // Fallback to active sheet import
        await handleFetchGoogleSheet();
      }
    } catch {
      await handleFetchGoogleSheet();
    } finally {
      setLoading(false);
    }
  };

  // Handle Pasted Text parse
  const handleParsePastedText = () => {
    const raw = pastedText.trim();
    if (!raw) {
      setErrorMsg('Please paste spreadsheet cells or CSV content.');
      return;
    }
    setErrorMsg(null);

    // If user pasted a Google Sheet link into the paste box, redirect smoothly
    if (raw.includes('docs.google.com/spreadsheets')) {
      setGoogleSheetUrl(raw);
      setActiveTab('google_sheet');
      return;
    }

    const parsed = parseSheetContent(pastedText, scaleOverride, {
      activeTabName: 'Pasted Sheet',
      sourceType: 'paste',
    });
    if (parsed.validRatingsCount === 0) {
      setErrorMsg('No valid artist ratings found in pasted text. Make sure columns contain artist names and numeric ratings.');
      return;
    }
    setPreviewResult(parsed);
    onUpdateRatings(parsed.ratings, parsed, pastedText);
    setSuccessMsg(`Parsed ${parsed.validRatingsCount} ratings successfully! (${parsed.detectedScale})`);
  };

  // Handle File Upload (.xlsx, .xls, .ods, .csv, .tsv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.ods');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const { tabs, sheetsCsv } = parseExcelWorkbook(buffer);

          if (tabs.length === 0) {
            throw new Error('No worksheets found in this workbook');
          }

          setAvailableTabs(tabs);
          setExcelSheetsMap(sheetsCsv);

          // Default to first tab (or tab containing 'aggregate' if exists)
          const aggregateTab = tabs.find((t) => t.name.toLowerCase().includes('aggregate') || t.name.toLowerCase().includes('average') || t.name.toLowerCase().includes('total'));
          const defaultTab = aggregateTab || tabs[0];

          const csvContent = sheetsCsv[defaultTab.name] || '';
          setPastedText(csvContent);
          setSelectedTabName(defaultTab.name);
          setSelectedTabGid(defaultTab.gid || '0');

          const parsed = parseSheetContent(csvContent, scaleOverride, {
            activeTabName: defaultTab.name,
            activeTabGid: defaultTab.gid,
            availableTabs: tabs,
            sourceType: 'upload',
          });

          setPreviewResult(parsed);
          onUpdateRatings(parsed.ratings, parsed, csvContent);
          setSuccessMsg(
            `Loaded Excel Workbook "${file.name}" with ${tabs.length} tabs! Active tab: "${defaultTab.name}" (${parsed.validRatingsCount} ratings)`
          );
        } catch (err: any) {
          setErrorMsg(`Error reading Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Standard CSV / text
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setPastedText(content);
          const parsed = parseSheetContent(content, scaleOverride, {
            activeTabName: file.name.replace(/\.[^/.]+$/, ''),
            sourceType: 'upload',
          });
          setPreviewResult(parsed);
          onUpdateRatings(parsed.ratings, parsed, content);
          setSuccessMsg(`Imported ${parsed.validRatingsCount} ratings from ${file.name}!`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Switch multi-tab workbook tab directly
  const handleSelectWorkbookTab = (tab: SheetTabInfo) => {
    let csvContent = tab.csvContent;
    if (!csvContent && excelSheetsMap[tab.name]) {
      csvContent = excelSheetsMap[tab.name];
    }
    if (!csvContent) return;

    setPastedText(csvContent);
    setSelectedTabName(tab.name);
    setSelectedTabGid(tab.gid || '0');

    const parsed = parseSheetContent(csvContent, scaleOverride, {
      activeTabName: tab.name,
      activeTabGid: tab.gid,
      availableTabs,
      sourceType: 'upload',
    });

    setPreviewResult(parsed);
    onUpdateRatings(parsed.ratings, parsed, csvContent);
    setSuccessMsg(`Switched to tab: "${tab.name}" (${parsed.validRatingsCount} artist ratings loaded)`);
  };

  // When scale selector changes, re-parse current text
  const handleScaleChange = (newScale: RatingScaleType) => {
    setScaleOverride(newScale);
    if (pastedText.trim()) {
      const parsed = parseSheetContent(pastedText, newScale, {
        activeTabName: selectedTabName,
        activeTabGid: selectedTabGid,
        availableTabs,
        sourceUrl: googleSheetUrl,
        sourceType: previewResult?.sourceType || 'paste',
      });
      setPreviewResult(parsed);
      onUpdateRatings(parsed.ratings, parsed, pastedText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div
        id="sheet-manager-modal"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Import User Band Ratings</h2>
                {selectedTabName && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    <span>Tab: {selectedTabName}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Supports multi-tab workbooks (different people or aggregate scores), Google Sheets, Excel (.xlsx), and custom scales.
              </p>
            </div>
          </div>
          <button
            id="btn-close-sheet-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs & Scale Config */}
        <div className="px-6 pt-3.5 pb-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/50">
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              id="tab-google-sheet"
              type="button"
              onClick={() => setActiveTab('google_sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'google_sheet' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Google Sheets (Multi-Tab)</span>
            </button>
            <button
              id="tab-upload"
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'upload' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Excel / CSV</span>
            </button>
            <button
              id="tab-paste"
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'paste' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Text / CSV</span>
            </button>
          </div>

          {/* Scale Normalization Selector */}
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-400" />
            <label htmlFor="scale-override-select" className="text-xs text-slate-300 font-medium">
              Rating Scale:
            </label>
            <select
              id="scale-override-select"
              value={scaleOverride}
              onChange={(e) => handleScaleChange(e.target.value as RatingScaleType)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="auto">Auto-Detect Scale</option>
              <option value="scale_10">Scale 1-10 (/10)</option>
              <option value="scale_5">Scale 1-5 Stars (/5)</option>
              <option value="scale_4">Scale 1-4 Tier (/4)</option>
              <option value="scale_100">Percentage 0-100%</option>
            </select>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Import Notice</p>
                <p className="mt-0.5 text-rose-300">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ready</p>
                <p className="mt-0.5 text-emerald-300">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Tab: Google Sheet URL */}
          {activeTab === 'google_sheet' && (
            <div className="space-y-4">
              <form onSubmit={(e) => handleFetchGoogleSheet(e)} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Google Sheets Link
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Must be shared as "Anyone with the link can view"
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="input-google-sheet-url"
                      type="url"
                      value={googleSheetUrl}
                      onChange={(e) => {
                        setGoogleSheetUrl(e.target.value);
                      }}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRX5nCy1OdpFx9hpt257KEn9/edit#gid=0"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                    <button
                      id="btn-fetch-google-sheet"
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0"
                    >
                      {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{loading ? 'Fetching...' : 'Import Tab'}</span>
                    </button>
                    <button
                      id="btn-discover-tabs"
                      type="button"
                      onClick={handleDiscoverGoogleSheetTabs}
                      disabled={loading || !googleSheetUrl.trim()}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shrink-0"
                      title="Inspect spreadsheet tabs"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Find All Tabs</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Tab Selector when Google Sheet has tabs */}
              {availableTabs.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Select Person / Tab from Google Sheet ({availableTabs.length} tabs found)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Click any tab to load its ratings</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableTabs.map((tab) => {
                      const isSelected =
                        selectedTabGid === tab.gid ||
                        selectedTabName.toLowerCase() === tab.name.toLowerCase();

                      return (
                        <button
                          key={tab.id || tab.gid || tab.name}
                          id={`btn-select-tab-${tab.gid || tab.name}`}
                          type="button"
                          disabled={loading}
                          onClick={() => handleSelectGoogleTab(tab)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          {tab.name.toLowerCase().includes('aggregate') || tab.name.toLowerCase().includes('average') || tab.name.toLowerCase().includes('total') ? (
                            <Users className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{tab.name}</span>
                          {tab.gid && <span className="text-[10px] opacity-60 font-mono">#{tab.gid}</span>}
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-400 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-300">How Google Sheet Tabs Work:</p>
                  <p>
                    Each person can have their own tab (or an aggregate average tab) in the same workbook. If your URL ends with <code>#gid=...</code>, that tab is automatically selected. You can also switch between any person's tab above with one click!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 rounded-2xl p-6 text-center transition bg-slate-950/40">
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-200">
                  Upload Excel (.xlsx, .xls, .ods) or CSV / TSV spreadsheet
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports multi-sheet workbooks with individual people's rating tabs and consensus aggregate tabs
                </p>
                <input
                  id="file-input-ratings"
                  type="file"
                  accept=".xlsx,.xls,.ods,.csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="mt-4 block mx-auto text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
              </div>

              {/* Worksheets list if multi-sheet Excel was uploaded */}
              {availableTabs.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Worksheet Tabs in Uploaded File ({availableTabs.length} tabs)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Select which person's tab to import</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableTabs.map((tab) => {
                      const isSelected = selectedTabName === tab.name;
                      return (
                        <button
                          key={tab.id || tab.name}
                          type="button"
                          onClick={() => handleSelectWorkbookTab(tab)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{tab.name}</span>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Paste Sheet / CSV */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Paste Spreadsheet Cells (or CSV text)
                </label>
                <textarea
                  id="textarea-pasted-sheet"
                  rows={7}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Artist,Rating,Review Summary,Genre\nDua Lipa,9.5,Masterclass in modern pop with flawless staging,Pop\nLCD Soundsystem,9.8,Best live dance-punk band on earth,Electronic\nFontaines D.C.,9.2,Raw post-punk fury and incredible poetry,Post-Punk`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  id="btn-parse-pasted"
                  type="button"
                  onClick={handleParsePastedText}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Parse & Normalize Ratings</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Preview Table */}
          {previewResult && previewResult.ratings.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Parsed Ratings Preview ({previewResult.validRatingsCount} bands)
                  </h3>
                  {selectedTabName && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Tab: {selectedTabName}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {previewResult.detectedScale}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Artist: <span className="text-slate-200 font-mono">{previewResult.artistColumn}</span> | Score: <span className="text-slate-200 font-mono">{previewResult.scoreColumn}</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Artist / Band</th>
                      <th className="py-2 px-3 font-semibold">Original Score</th>
                      <th className="py-2 px-3 font-semibold">Normalized (%)</th>
                      <th className="py-2 px-3 font-semibold">Review Summary</th>
                      <th className="py-2 px-3 font-semibold">Genre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {previewResult.ratings.slice(0, 15).map((r, i) => (
                      <tr key={r.id || i} className="hover:bg-slate-800/40">
                        <td className="py-1.5 px-3 font-medium text-slate-200">{r.artist}</td>
                        <td className="py-1.5 px-3 font-mono text-amber-300">{r.rawScore}</td>
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400 font-mono">{r.normalizedScore}%</span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${r.normalizedScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-slate-400 truncate max-w-xs">{r.reviewSummary || '—'}</td>
                        <td className="py-1.5 px-3 text-slate-400">{r.genre || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewResult.ratings.length > 15 && (
                <p className="text-[11px] text-slate-500 text-center">
                  + {previewResult.ratings.length - 15} more artists loaded in memory
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {ratings.length > 0 ? (
              <>
                <span className="text-emerald-400 font-medium">✓ {ratings.length} ratings active in planner</span>
                {selectedTabName && (
                  <span className="text-slate-400 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    Tab: {selectedTabName}
                  </span>
                )}
              </>
            ) : (
              <span>No ratings loaded yet</span>
            )}
          </div>
          <button
            id="btn-apply-ratings"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};

