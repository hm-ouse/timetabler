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
 * - Published URLs: https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pubhtml
 * - Direct export URLs: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
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

  // 1. Published sheet: /spreadsheets/d/e/{ID}/...
  const publishedMatch = cleanUrl.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (publishedMatch) {
    return {
      isGoogleSheet: true,
      isPublished: true,
      publishedId: publishedMatch[1],
      gid,
      cleanUrl,
    };
  }

  // 2. Standard spreadsheet ID (minimum 15 characters, avoids matching 'e')
  const standardMatch = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,})/);
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
  const isGoogleSheet = cleanUrl.includes('docs.google.com/spreadsheets');
  const isPublished = cleanUrl.includes('/pubhtml') || cleanUrl.includes('/pub');

  return {
    isGoogleSheet,
    isPublished,
    gid,
    cleanUrl,
  };
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
 * Helper to discover all tabs / worksheets in a public/shared Google Spreadsheet
 * Fetches the entire workbook via the XLSX export API for 100% accurate tab names & contents.
 */
async function inspectGoogleSheetTabs(sheetId: string, requestedGid?: string): Promise<{
  title: string;
  tabs: Array<{ id: string; name: string; gid: string; isDefault: boolean; rowCount?: number; csvContent?: string }>;
  sheetsCsv: Record<string, string>;
  isPrivate?: boolean;
}> {
  const tabs: Array<{ id: string; name: string; gid: string; isDefault: boolean; rowCount?: number; csvContent?: string }> = [];
  const sheetsCsv: Record<string, string> = {};
  let docTitle = 'Google Spreadsheet';

  // 1. Try XLSX export (most reliable for all sheet names, e.g. Home, H, K)
  try {
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const response = await fetch(xlsxUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer && buffer.byteLength > 500) {
        // Validate it is not an HTML login page returned with 200
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
            sheetNames.forEach((name, idx) => {
              const ws = workbook.Sheets[name];
              const csv = XLSX.utils.sheet_to_csv(ws);
              sheetsCsv[name] = csv;
              const rowCount = csv.split('\n').filter((r) => r.trim().length > 0).length;

              tabs.push({
                id: `tab-${idx}`,
                name,
                gid: String(idx),
                isDefault: idx === 0 || (requestedGid !== undefined && String(idx) === requestedGid),
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

  // 2. Fallback: Scrape htmlview if XLSX export was blocked
  const tabsMap = new Map<string, { id: string; name: string; gid: string; isDefault: boolean }>();
  try {
    const htmlUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
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

      // Extract document title
      const titleMatch =
        html.match(/<meta property="og:title" content="([^"]+)">/) || html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        docTitle = titleMatch[1].replace(' - Google Sheets', '').replace(' - Google Drive', '').trim();
      }

      // Pattern: <li id="sheet-button-12345"><a ...>SheetName</a></li>
      const liRegex = /<li[^>]*id=["']sheet-button-([0-9]+)["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(html)) !== null) {
        const gid = liMatch[1];
        const rawName = liMatch[2].replace(/<[^>]+>/g, '').trim();
        if (gid && rawName && !tabsMap.has(gid)) {
          tabsMap.set(gid, {
            id: gid,
            gid,
            name: rawName,
            isDefault: gid === '0' || gid === requestedGid,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Could not scrape tabs from htmlview:', err);
  }

  if (tabsMap.size > 0) {
    return {
      title: docTitle,
      tabs: Array.from(tabsMap.values()),
      sheetsCsv,
    };
  }

  // Final fallback
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

    if (parsed.isPublished) {
      // For published sheets, single tab or pubhtml scrape
      return res.json({
        ok: true,
        sheetId: parsed.publishedId || 'published',
        title: 'Published Google Sheet',
        currentGid: parsed.gid || '0',
        tabs: [{ id: '0', gid: parsed.gid || '0', name: 'Published Sheet', isDefault: true }],
        sheetsCsv: {},
      });
    }

    if (!parsed.sheetId) {
      return res.status(200).json({
        ok: false,
        error: 'Could not extract Google Sheet ID from URL. Please check the link.',
      });
    }

    const { title, tabs, sheetsCsv, isPrivate } = await inspectGoogleSheetTabs(parsed.sheetId, parsed.gid);

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
      sheetId: parsed.sheetId,
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

    const effectiveGid = customGid !== undefined ? String(customGid) : parsed.gid || '0';

    // 1. If it's a published Google Sheet (/d/e/{ID}/pubhtml or /pub)
    if (parsed.isPublished) {
      const candidatePubUrls: string[] = [];
      if (parsed.publishedId) {
        candidatePubUrls.push(
          `https://docs.google.com/spreadsheets/d/e/${parsed.publishedId}/pub?output=csv&gid=${effectiveGid}`
        );
      }
      if (parsed.cleanUrl.includes('/pubhtml')) {
        candidatePubUrls.push(parsed.cleanUrl.replace('/pubhtml', `/pub?output=csv&gid=${effectiveGid}`));
      } else if (parsed.cleanUrl.includes('/pub')) {
        const base = parsed.cleanUrl.split('?')[0];
        candidatePubUrls.push(`${base}?output=csv&gid=${effectiveGid}`);
      }

      for (const pubUrl of candidatePubUrls) {
        try {
          const resp = await fetch(pubUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/csv,text/plain,*/*',
            },
          });
          if (resp.ok) {
            const text = await resp.text();
            const { isHtml, isLogin } = inspectHtmlContent(text);
            if (!isHtml && text.trim().length > 0) {
              const activeTab = {
                id: effectiveGid,
                gid: effectiveGid,
                name: sheetName || 'Published Sheet',
                isDefault: true,
              };
              return res.json({
                ok: true,
                csv: text,
                source: pubUrl,
                docTitle: 'Published Google Sheet',
                activeTab,
                availableTabs: [activeTab],
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
        } catch (err) {
          console.warn('Published sheet fetch attempt failed:', err);
        }
      }
    }

    // 2. If standard Google Sheet ID exists, try XLSX tab extraction first
    if (parsed.sheetId) {
      const sheetId = parsed.sheetId;
      const { title, tabs, sheetsCsv, isPrivate } = await inspectGoogleSheetTabs(sheetId, effectiveGid);

      if (isPrivate) {
        return res.status(200).json({
          ok: false,
          isPrivate: true,
          error:
            'This Google Sheet is private or requires Google login. In Google Sheets, click "Share" (top-right), set access to "Anyone with the link can view", or copy the sheet cells and paste them into the "Paste Sheet" tab.',
        });
      }

      if (tabs.length > 0) {
        let matchedTab = tabs[0];
        if (sheetName) {
          const foundByName = tabs.find(
            (t) => t.name.toLowerCase().trim() === String(sheetName).toLowerCase().trim()
          );
          if (foundByName) matchedTab = foundByName;
        } else if (effectiveGid !== undefined) {
          const foundByGid = tabs.find((t) => t.gid === effectiveGid || t.id === effectiveGid || t.id === `tab-${effectiveGid}`);
          if (foundByGid) matchedTab = foundByGid;
        }

        const activeCsv = matchedTab.csvContent || sheetsCsv[matchedTab.name] || '';
        if (activeCsv && activeCsv.trim().length > 0) {
          return res.json({
            ok: true,
            csv: activeCsv,
            docTitle: title,
            activeTab: matchedTab,
            availableTabs: tabs,
            sheetsCsv,
          });
        }
      }
    }

    // 3. Fallback: Query Google visualization / export CSV endpoints
    const candidateUrls: string[] = [];
    if (parsed.sheetId) {
      const sheetId = parsed.sheetId;
      if (sheetName) {
        candidateUrls.push(
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
        );
      }
      candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${effectiveGid}`);
      candidateUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${effectiveGid}`);
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
            const activeTab = {
              id: effectiveGid,
              gid: effectiveGid,
              name: sheetName || (effectiveGid === '0' ? 'Main Sheet' : `Tab ${effectiveGid}`),
              isDefault: true,
            };

            return res.json({
              ok: true,
              csv: text,
              source: fetchUrl,
              docTitle: 'Google Sheet',
              activeTab,
              availableTabs: [activeTab],
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
        console.warn('Candidate fetch attempt failed:', e);
      }
    }

    // If all failed, return clean JSON with status 200 to prevent proxy HTML replacements
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
