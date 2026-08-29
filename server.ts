import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Lazy init Gemini SDK
let genAIClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * Robust Google Sheet URL parser supporting:
 * - Standard edit URLs: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid={GID}
 * - Profile URLs: https://docs.google.com/spreadsheets/u/0/d/{SHEET_ID}/edit#gid={GID}
 * - Published URLs: https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pubhtml
 * - Direct export URLs: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
 * - Google Drive file URLs: https://drive.google.com/file/d/{SHEET_ID}/view
 * - URLs wrapped in quotes or angle brackets
 */
function parseGoogleSheetUrl(rawUrl: string): {
  isGoogleSheet: boolean;
  isPublished: boolean;
  sheetId?: string;
  publishedId?: string;
  gid?: string;
  cleanUrl: string;
} {
  let cleanUrl = (rawUrl || '').trim();
  // Strip surrounding quotes or brackets if present
  cleanUrl = cleanUrl.replace(/^["'<]+|["'>]+$/g, '').trim();

  const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : undefined;

  // 1. Published sheet: /d/e/{ID}
  const publishedMatch = cleanUrl.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (publishedMatch) {
    return {
      isGoogleSheet: true,
      isPublished: true,
      publishedId: publishedMatch[1],
      gid,
      cleanUrl,
    };
  }

  // 2. Standard spreadsheet ID (at least 15 characters, avoids matching 'e')
  const standardMatch = cleanUrl.match(/\/d\/(?!e\/)([a-zA-Z0-9-_]{15,})/);
  if (standardMatch) {
    return {
      isGoogleSheet: true,
      isPublished: false,
      sheetId: standardMatch[1],
      gid,
      cleanUrl,
    };
  }

  // 3. Fallback check for docs.google.com
  const isGoogleSheet = cleanUrl.includes('docs.google.com/spreadsheets') || cleanUrl.includes('drive.google.com');
  const isPublished = cleanUrl.includes('/pubhtml') || cleanUrl.includes('/pub');

  return {
    isGoogleSheet,
    isPublished,
    gid,
    cleanUrl,
  };
}

/**
 * Helper to decode Google HTML / JS escaped strings (e.g. \x27, \x22, \uXXXX, &amp;, &#39;)
 */
function decodeGoogleEscapedString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\x27/g, "'")
    .replace(/\\x22/g, '"')
    .replace(/\\x26/g, '&')
    .replace(/\\x3d/g, '=')
    .replace(/\\x2f/g, '/')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Helper to inspect if text is HTML (e.g. login or access denied page)
 */
function inspectHtmlContent(text: string): { isHtml: boolean; isLogin: boolean } {
  const trimmed = (text || '').trim();
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

  return { isHtml, isLogin };
}

/**
 * Helper to extract tabs from Google Sheets HTML (htmlview, pubhtml, or edit page)
 */
function extractTabsFromGoogleHtml(
  html: string,
  requestedGid?: string
): Array<{ id: string; name: string; gid: string; isDefault: boolean }> {
  const tabsList: Array<{ id: string; name: string; gid: string; isDefault: boolean }> = [];
  const seenNames = new Set<string>();
  const seenGids = new Set<string>();

  const addTab = (name: string, gid: string) => {
    const cleanName = decodeGoogleEscapedString(name).trim();
    const cleanGid = (gid || '').trim();
    if (
      !cleanName ||
      cleanName.length === 0 ||
      seenNames.has(cleanName.toLowerCase()) ||
      cleanName.toLowerCase().includes('google') ||
      cleanName.toLowerCase().includes('report abuse') ||
      cleanName.toLowerCase().includes('drive')
    ) {
      return;
    }
    seenNames.add(cleanName.toLowerCase());
    if (cleanGid) seenGids.add(cleanGid);
    const effectiveGid = cleanGid || String(tabsList.length);
    tabsList.push({
      id: effectiveGid,
      gid: effectiveGid,
      name: cleanName,
      isDefault:
        requestedGid !== undefined
          ? effectiveGid === requestedGid
          : tabsList.length === 0 || effectiveGid === '0',
    });
  };

  // Pattern A: items.push({name: "...", pageUrl: "...", gid: "..."})
  const itemRegex = /items\.push\(\s*\{([\s\S]*?)\}\s*\);?/g;
  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/name:\s*["']((?:\\.|[^"'\\])*)["']/);
    const gidMatch =
      block.match(/gid:\s*["']?([0-9]+)["']?/) ||
      block.match(/[?&]gid(?:\\x3d|=)([0-9]+)/);
    if (nameMatch) {
      addTab(nameMatch[1], gidMatch ? gidMatch[1] : '');
    }
  }

  // Pattern B: var items = [{name: "..."}, ...]
  const itemsArrayMatch = html.match(/var\s+items\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
  if (itemsArrayMatch && tabsList.length === 0) {
    const objRegex = /\{([^{}]+)\}/g;
    let m2;
    while ((m2 = objRegex.exec(itemsArrayMatch[1])) !== null) {
      const block = m2[1];
      const nameMatch = block.match(/name:\s*["']((?:\\.|[^"'\\])*)["']/);
      const gidMatch =
        block.match(/gid:\s*["']?([0-9]+)["']?/) ||
        block.match(/[?&]gid(?:\\x3d|=)([0-9]+)/);
      if (nameMatch) {
        addTab(nameMatch[1], gidMatch ? gidMatch[1] : '');
      }
    }
  }

  // Pattern C: <li id="sheet-button-123"><a ...>SheetName</a></li>
  const liRegex = /<li[^>]*id=["']sheet-button-([0-9]+)["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
  let liMatch;
  while ((liMatch = liRegex.exec(html)) !== null) {
    const gid = liMatch[1];
    const rawName = liMatch[2].replace(/<[^>]+>/g, '').trim();
    if (gid && rawName) {
      addTab(rawName, gid);
    }
  }

  // Pattern D: <div class="docs-sheet-tab-caption">SheetName</div>
  const captionRegex = /class=["'][^"']*docs-sheet-tab-caption[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let capMatch;
  let capIndex = 0;
  while ((capMatch = captionRegex.exec(html)) !== null) {
    const rawName = capMatch[1].replace(/<[^>]+>/g, '').trim();
    if (rawName) {
      addTab(rawName, String(capIndex));
      capIndex++;
    }
  }

  // Pattern E: links with gid in pubhtml or preview: <a href="...gid=123...">SheetName</a>
  const linkRegex = /<a[^>]+href=["'][^"']*[?&#]gid=([0-9]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const gid = linkMatch[1];
    const rawName = linkMatch[2].replace(/<[^>]+>/g, '').trim();
    if (gid && rawName) {
      addTab(rawName, gid);
    }
  }

  return tabsList;
}

/**
 * Helper to discover all tabs / worksheets in a Google Spreadsheet.
 * Uses a multi-tiered approach:
 * 1. XLSX workbook export (extracts all sheet names and full CSV content)
 * 2. htmlview / pubhtml scraping (extracts sheet tabs, GIDs, and document title)
 * 3. edit page HTML inspection (fallback for private-access detection or caption scraping)
 */
async function inspectGoogleSheetTabs(
  id: string,
  requestedGid?: string,
  isPublished: boolean = false
): Promise<{
  title: string;
  tabs: Array<{ id: string; name: string; gid: string; isDefault: boolean; rowCount?: number; csvContent?: string }>;
  sheetsCsv: Record<string, string>;
  isPrivate?: boolean;
}> {
  const tabs: Array<{ id: string; name: string; gid: string; isDefault: boolean; rowCount?: number; csvContent?: string }> = [];
  const sheetsCsv: Record<string, string> = {};
  let docTitle = 'Google Spreadsheet';

  // 1. Try XLSX export for standard sheets (most accurate for names & full content of all tabs)
  if (!isPublished) {
    try {
      const xlsxUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
      const response = await fetch(xlsxUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer && buffer.byteLength > 500) {
          const prefix = new TextDecoder().decode(buffer.slice(0, 150)).trim().toLowerCase();
          if (prefix.startsWith('<!doctype') || prefix.startsWith('<html')) {
            const fullText = new TextDecoder().decode(buffer);
            const { isLogin } = inspectHtmlContent(fullText);
            if (isLogin) {
              return { title: docTitle, tabs: [], sheetsCsv: {}, isPrivate: true };
            }
          } else {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetNames = workbook.SheetNames || [];

            if (sheetNames.length > 0) {
              // Also query htmlview quickly to resolve exact Google GIDs and document title
              const htmlGidMap = new Map<string, string>();
              try {
                const htmlUrl = `https://docs.google.com/spreadsheets/d/${id}/htmlview`;
                const htmlResp = await fetch(htmlUrl, {
                  headers: {
                    'User-Agent':
                      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  },
                });
                if (htmlResp.ok) {
                  const html = await htmlResp.text();
                  const titleMatch =
                    html.match(/<meta property="og:title" content="([^"]+)">/) || html.match(/<title>([^<]+)<\/title>/);
                  if (titleMatch && titleMatch[1]) {
                    docTitle = titleMatch[1].replace(' - Google Sheets', '').replace(' - Google Drive', '').trim();
                  }
                  const htmlTabs = extractTabsFromGoogleHtml(html, requestedGid);
                  htmlTabs.forEach((ht) => {
                    htmlGidMap.set(ht.name.toLowerCase().trim(), ht.gid);
                  });
                }
              } catch (e) {
                console.warn('HTML title/gid enrichment failed:', e);
              }

              sheetNames.forEach((name, idx) => {
                const ws = workbook.Sheets[name];
                const csv = XLSX.utils.sheet_to_csv(ws);
                sheetsCsv[name] = csv;
                const rowCount = csv.split('\n').filter((r) => r.trim().length > 0).length;
                const mappedGid = htmlGidMap.get(name.toLowerCase().trim()) || (idx === 0 ? '0' : String(idx));

                tabs.push({
                  id: mappedGid,
                  name,
                  gid: mappedGid,
                  isDefault:
                    requestedGid !== undefined
                      ? mappedGid === requestedGid || String(idx) === requestedGid
                      : idx === 0,
                  rowCount,
                  csvContent: csv,
                });
              });

              return {
                title: docTitle,
                tabs,
                sheetsCsv,
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('XLSX export fetch failed, falling back to HTML scrape:', err);
    }
  }

  // 2. Fallback or Published: Scrape htmlview / pubhtml
  try {
    const htmlUrl = isPublished
      ? `https://docs.google.com/spreadsheets/d/e/${id}/pubhtml`
      : `https://docs.google.com/spreadsheets/d/${id}/htmlview`;

    const response = await fetch(htmlUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      const html = await response.text();
      const { isLogin } = inspectHtmlContent(html);
      if (isLogin) {
        return { title: docTitle, tabs: [], sheetsCsv: {}, isPrivate: true };
      }

      const titleMatch =
        html.match(/<meta property="og:title" content="([^"]+)">/) || html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        docTitle = titleMatch[1].replace(' - Google Sheets', '').replace(' - Google Drive', '').trim();
      }

      const parsedTabs = extractTabsFromGoogleHtml(html, requestedGid);
      if (parsedTabs.length > 0) {
        return {
          title: docTitle,
          tabs: parsedTabs,
          sheetsCsv,
        };
      }
    }
  } catch (err) {
    console.warn('Could not scrape tabs from htmlview/pubhtml:', err);
  }

  // 3. Fallback: Check edit page if standard sheet
  if (!isPublished) {
    try {
      const editUrl = `https://docs.google.com/spreadsheets/d/${id}/edit`;
      const editResp = await fetch(editUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (editResp.ok) {
        const editHtml = await editResp.text();
        const { isLogin } = inspectHtmlContent(editHtml);
        if (isLogin) {
          return { title: docTitle, tabs: [], sheetsCsv: {}, isPrivate: true };
        }
        const editTabs = extractTabsFromGoogleHtml(editHtml, requestedGid);
        if (editTabs.length > 0) {
          return {
            title: docTitle,
            tabs: editTabs,
            sheetsCsv,
          };
        }
      }
    } catch (err) {
      console.warn('Could not inspect edit page:', err);
    }
  }

  // 4. Default fallback: Single tab
  const defaultGid = requestedGid || '0';
  return {
    title: docTitle,
    tabs: [
      {
        id: defaultGid,
        gid: defaultGid,
        name: defaultGid === '0' ? 'Main Sheet' : `Sheet (GID: ${defaultGid})`,
        isDefault: true,
      },
    ],
    sheetsCsv,
  };
}

/**
 * List all tabs available in a Google Sheet
 */
app.post('/api/list-google-sheet-tabs', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(200).json({ ok: false, error: 'URL is required' });
    }

    const parsed = parseGoogleSheetUrl(url);
    if (!parsed.isGoogleSheet) {
      return res.status(200).json({
        ok: false,
        error: 'Invalid Google Sheet URL format. Please paste a link from docs.google.com/spreadsheets/...',
      });
    }

    const targetId = parsed.sheetId || parsed.publishedId;
    if (!targetId) {
      return res.status(200).json({
        ok: false,
        error: 'Could not extract Google Sheet ID from URL. Please check the link.',
      });
    }

    const { title, tabs, sheetsCsv, isPrivate } = await inspectGoogleSheetTabs(
      targetId,
      parsed.gid,
      parsed.isPublished
    );

    if (isPrivate) {
      return res.status(200).json({
        ok: false,
        error:
          'This Google Sheet is private or requires Google login. In Google Sheets, click "Share" (top-right), set access to "Anyone with the link can view", or copy the sheet cells and paste them into the "Paste Sheet" tab.',
        isPrivate: true,
      });
    }

    return res.json({
      ok: true,
      sheetId: targetId,
      title,
      currentGid: parsed.gid || (tabs[0] ? tabs[0].gid : '0'),
      tabs,
      sheetsCsv,
    });
  } catch (error: any) {
    console.error('Error listing Google Sheet tabs:', error);
    return res.status(200).json({
      ok: false,
      error: error.message || 'Failed to list Google Sheet tabs',
    });
  }
});

/**
 * Fetch and extract Google Sheets CSV data for a specific tab/sheet
 */
app.post('/api/fetch-google-sheet', async (req, res) => {
  try {
    const { url, gid: customGid, sheetName } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(200).json({ ok: false, error: 'URL is required' });
    }

    const parsed = parseGoogleSheetUrl(url);
    if (!parsed.isGoogleSheet) {
      return res.status(200).json({
        ok: false,
        error: 'Invalid Google Sheet URL format. Please paste a link from docs.google.com/spreadsheets/...',
      });
    }

    const targetId = parsed.sheetId || parsed.publishedId;
    if (!targetId) {
      return res.status(200).json({
        ok: false,
        error: 'Could not extract Google Sheet ID from URL. Please check the link.',
      });
    }

    const effectiveGid = customGid !== undefined ? String(customGid) : parsed.gid || '0';

    // 1. Discover all tabs and pre-cached CSVs
    const { title, tabs, sheetsCsv, isPrivate } = await inspectGoogleSheetTabs(
      targetId,
      effectiveGid,
      parsed.isPublished
    );

    if (isPrivate) {
      return res.status(200).json({
        ok: false,
        isPrivate: true,
        error:
          'This Google Sheet is private or requires Google login. In Google Sheets, click "Share" (top-right), set access to "Anyone with the link can view", or copy the sheet cells and paste them into the "Paste Sheet" tab.',
      });
    }

    // 2. Identify the target tab to load
    let matchedTab = tabs[0];
    if (sheetName && sheetName !== 'Main Sheet' && sheetName !== 'Published Sheet') {
      const foundByName = tabs.find(
        (t) => t.name.toLowerCase().trim() === String(sheetName).toLowerCase().trim()
      );
      if (foundByName) matchedTab = foundByName;
    } else if (effectiveGid !== undefined) {
      const foundByGid = tabs.find(
        (t) => t.gid === effectiveGid || t.id === effectiveGid || t.id === `tab-${effectiveGid}`
      );
      if (foundByGid) matchedTab = foundByGid;
    }

    // 3. If CSV is already cached in memory (from XLSX export), return it immediately
    const cachedCsv = matchedTab?.csvContent || (matchedTab ? sheetsCsv[matchedTab.name] : '') || '';
    if (cachedCsv && cachedCsv.trim().length > 0) {
      return res.json({
        ok: true,
        csv: cachedCsv,
        docTitle: title,
        activeTab: matchedTab,
        availableTabs: tabs,
        sheetsCsv,
      });
    }

    // 4. Fetch CSV for the target tab
    const candidateUrls: string[] = [];
    const targetGid = matchedTab?.gid || effectiveGid;
    const targetTabName = matchedTab?.name || sheetName;

    if (parsed.isPublished) {
      candidateUrls.push(
        `https://docs.google.com/spreadsheets/d/e/${targetId}/pub?output=csv&gid=${targetGid}`
      );
      if (parsed.cleanUrl.includes('/pubhtml')) {
        candidateUrls.push(parsed.cleanUrl.replace('/pubhtml', `/pub?output=csv&gid=${targetGid}`));
      }
    } else {
      if (targetTabName && targetTabName !== 'Main Sheet') {
        candidateUrls.push(
          `https://docs.google.com/spreadsheets/d/${targetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(targetTabName)}`
        );
      }
      candidateUrls.push(
        `https://docs.google.com/spreadsheets/d/${targetId}/gviz/tq?tqx=out:csv&gid=${targetGid}`
      );
      candidateUrls.push(
        `https://docs.google.com/spreadsheets/d/${targetId}/export?format=csv&gid=${targetGid}`
      );
    }

    for (const fetchUrl of candidateUrls) {
      try {
        const resp = await fetch(fetchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/csv,text/plain,application/csv,*/*',
          },
        });

        if (resp.ok) {
          const text = await resp.text();
          const { isHtml, isLogin } = inspectHtmlContent(text);

          if (!isHtml && text.trim().length > 0) {
            const activeTab = matchedTab || {
              id: targetGid,
              gid: targetGid,
              name: targetTabName || (targetGid === '0' ? 'Main Sheet' : `Tab ${targetGid}`),
              isDefault: true,
            };

            // Cache fetched CSV
            if (activeTab.name) {
              sheetsCsv[activeTab.name] = text;
            }

            return res.json({
              ok: true,
              csv: text,
              source: fetchUrl,
              docTitle: title,
              activeTab,
              availableTabs: tabs.length > 0 ? tabs : [activeTab],
              sheetsCsv,
            });
          }

          if (isLogin) {
            return res.status(200).json({
              ok: false,
              isPrivate: true,
              error:
                'This Google Sheet is private or requires Google login. In Google Sheets, click "Share" (top-right), set access to "Anyone with the link can view", or copy the sheet cells and paste them into the "Paste Sheet" tab.',
            });
          }
        }
      } catch (e) {
        console.warn('Fetch candidate URL failed:', e);
      }
    }

    return res.status(200).json({
      ok: false,
      error:
        'Could not fetch Google Sheet data. Make sure the Google Sheet sharing setting is set to "Anyone with the link can view", or copy & paste the sheet cells directly into the "Paste Sheet" tab.',
    });
  } catch (error: any) {
    console.error('Error fetching Google Sheet:', error);
    return res.status(200).json({
      ok: false,
      error: error.message || 'Failed to fetch Google Sheet',
      suggestion: 'You can also copy and paste the cells or upload a CSV/Excel file.',
    });
  }
});

// Vite middleware in dev or static files in prod
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Festival Timetable Server running on port ${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Server startup error:', err);
});
