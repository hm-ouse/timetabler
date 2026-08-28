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
 * Helper to discover all tabs / worksheets in a public/shared Google Spreadsheet
 * Fetches the entire workbook via the XLSX export API for 100% accurate tab names & contents.
 */
async function inspectGoogleSheetTabs(sheetId: string, requestedGid?: string): Promise<{
  title: string;
  tabs: Array<{ id: string; name: string; gid: string; isDefault: boolean; rowCount?: number; csvContent?: string }>;
  sheetsCsv: Record<string, string>;
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
      return res.status(400).json({ error: 'URL is required' });
    }

    const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const urlGid = gidMatch ? gidMatch[1] : undefined;

    if (!sheetIdMatch) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL format. Must be docs.google.com/spreadsheets/d/...' });
    }

    const sheetId = sheetIdMatch[1];
    const { title, tabs, sheetsCsv } = await inspectGoogleSheetTabs(sheetId, urlGid);

    return res.json({
      sheetId,
      title,
      currentGid: urlGid || (tabs[0] ? tabs[0].gid : '0'),
      tabs,
      sheetsCsv,
    });
  } catch (error: any) {
    console.error('Error listing Google Sheet tabs:', error);
    return res.status(500).json({
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
      return res.status(400).json({ error: 'URL is required' });
    }

    // Extract sheetId and target GID
    const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const targetGid = customGid !== undefined ? String(customGid) : gidMatch ? gidMatch[1] : undefined;

    if (sheetIdMatch) {
      const sheetId = sheetIdMatch[1];
      const { title, tabs, sheetsCsv } = await inspectGoogleSheetTabs(sheetId, targetGid);

      if (tabs.length > 0) {
        // Find matching tab: by sheetName or targetGid or default
        let matchedTab = tabs[0];
        if (sheetName) {
          const foundByName = tabs.find(
            (t) => t.name.toLowerCase().trim() === String(sheetName).toLowerCase().trim()
          );
          if (foundByName) matchedTab = foundByName;
        } else if (targetGid !== undefined) {
          const foundByGid = tabs.find((t) => t.gid === targetGid || t.id === targetGid || t.id === `tab-${targetGid}`);
          if (foundByGid) matchedTab = foundByGid;
        }

        const activeCsv = matchedTab.csvContent || sheetsCsv[matchedTab.name] || '';

        if (activeCsv) {
          return res.json({
            csv: activeCsv,
            docTitle: title,
            activeTab: matchedTab,
            availableTabs: tabs,
            sheetsCsv,
          });
        }
      }
    }

    // Fallback if XLSX inspection didn't produce activeCsv
    let csvUrl = url.trim();
    if (sheetIdMatch) {
      const sheetId = sheetIdMatch[1];
      const effectiveGid = targetGid || '0';
      if (sheetName) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      } else {
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${effectiveGid}`;
      }
    } else if (url.includes('/pubhtml')) {
      const effectiveGid = targetGid || '0';
      csvUrl = url.replace('/pubhtml', `/pub?output=csv&gid=${effectiveGid}`);
    }

    let response = await fetch(csvUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/csv,text/plain,application/csv,*/*',
      },
    });

    if (!response.ok && sheetIdMatch) {
      const sheetId = sheetIdMatch[1];
      const effectiveGid = targetGid || '0';
      const altUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${effectiveGid}`;
      response = await fetch(altUrl);
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Could not fetch Google Sheet tab directly (${response.statusText}). Make sure the Google Sheet sharing setting is set to "Anyone with the link can view", or copy & paste the sheet content directly.`,
      });
    }

    const csvText = await response.text();
    const activeTab = {
      id: targetGid || '0',
      gid: targetGid || '0',
      name: sheetName || (targetGid === '0' ? 'Main Sheet' : `Tab ${targetGid}`),
      isDefault: true,
    };

    return res.json({
      csv: csvText,
      source: csvUrl,
      docTitle: 'Google Sheet',
      activeTab,
      availableTabs: [activeTab],
    });
  } catch (error: any) {
    console.error('Error fetching Google Sheet:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch Google Sheet',
      suggestion: 'You can also copy and paste the cells or upload a CSV/Excel file.',
    });
  }
});

/**
 * Fetch and extract Clashfinder timetable
 * Clashfinder URLs: clashfinder.com/s/festivalname or clashfinder.com/m/festivalname
 * Clashfinder supports CSV export at /s/festivalname/?csv or /m/festivalname/?csv
 */
app.post('/api/fetch-clashfinder', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Clashfinder URL or ID is required' });
    }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      if (cleanUrl.startsWith('clashfinder.com')) {
        cleanUrl = 'https://' + cleanUrl;
      } else {
        // Assume it's a slug or ID e.g. "glasto2024"
        cleanUrl = `https://clashfinder.com/s/${cleanUrl}`;
      }
    }

    // Try fetching the CSV endpoint first
    let csvTargetUrl = cleanUrl;
    if (!csvTargetUrl.endsWith('/?csv') && !csvTargetUrl.endsWith('&csv')) {
      if (csvTargetUrl.includes('?')) {
        csvTargetUrl += '&csv';
      } else {
        csvTargetUrl = csvTargetUrl.replace(/\/?$/, '/?csv');
      }
    }

    let csvResponse = await fetch(csvTargetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (csvResponse.ok) {
      const csvText = await csvResponse.text();
      // Check if it's actually CSV and contains band/stage information
      if (csvText.includes(',') && !csvText.includes('<!DOCTYPE html>') && csvText.length > 50) {
        return res.json({ format: 'csv', data: csvText, url: cleanUrl });
      }
    }

    // If CSV didn't work directly, fetch the HTML page and let Gemini extract the timetable
    const htmlResponse = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch Clashfinder page (${htmlResponse.status}: ${htmlResponse.statusText})`);
    }

    const htmlText = await htmlResponse.text();

    // Use Gemini to extract structured festival timetable from the HTML/text
    const ai = getGemini();
    const cleanText = htmlText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 40000); // within token safety

    const prompt = `You are a festival timetable parser. Extract all stages, days, and artist set times from this Clashfinder data:
${cleanText}

Return a structured JSON object containing:
- festivalName: string
- days: array of objects { id: string (e.g. "day-1", "friday"), name: string (e.g. "Friday 27 June"), date: string (YYYY-MM-DD if available) }
- stages: array of strings (e.g. ["Pyramid Stage", "Other Stage", "West Holts"])
- sets: array of objects {
    artist: string,
    stage: string,
    day: string (matches day name or date),
    startTime: string (e.g. "14:30" or "2026-06-27T14:30:00"),
    endTime: string (e.g. "15:30" or "2026-06-27T15:30:00"),
    notes: string (optional)
  }
`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            festivalName: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  date: { type: Type.STRING },
                },
                required: ['id', 'name'],
              },
            },
            stages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            sets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  artist: { type: Type.STRING },
                  stage: { type: Type.STRING },
                  day: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['artist', 'stage', 'day', 'startTime', 'endTime'],
              },
            },
          },
          required: ['festivalName', 'days', 'stages', 'sets'],
        },
      },
    });

    const parsedJson = JSON.parse(aiRes.text || '{}');
    return res.json({ format: 'structured', data: parsedJson, url: cleanUrl });
  } catch (error: any) {
    console.error('Error fetching Clashfinder:', error);
    return res.status(500).json({
      error: error.message || 'Failed to parse Clashfinder URL',
    });
  }
});

/**
 * AI Web Scraper / Lineup Extractor for any festival URL or Festival Name
 */
app.post('/api/scrape-festival-lineup', async (req, res) => {
  try {
    const { query, festivalUrl } = req.body;
    const ai = getGemini();

    let searchPrompt = '';
    if (festivalUrl) {
      searchPrompt = `Find the complete festival timetable, stages, artist schedule, and set times for the festival at URL: ${festivalUrl}`;
    } else {
      searchPrompt = `Find the complete festival timetable, stage schedule, lineup and set times for: ${query}`;
    }

    const prompt = `${searchPrompt}

Extract all stages, days, artists, and their playing times (start time and end time).
Format the output as a JSON object with:
- festivalName: string
- location: string (optional)
- year: number or string
- days: array of { id: string, name: string, date: string }
- stages: array of string
- sets: array of { artist: string, stage: string, day: string, startTime: string (HH:MM or full ISO), endTime: string (HH:MM or full ISO), description: string (optional) }

Ensure all artist names, stages, start times, and end times are accurate.`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            festivalName: { type: Type.STRING },
            location: { type: Type.STRING },
            year: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  date: { type: Type.STRING },
                },
                required: ['id', 'name'],
              },
            },
            stages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            sets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  artist: { type: Type.STRING },
                  stage: { type: Type.STRING },
                  day: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['artist', 'stage', 'day', 'startTime', 'endTime'],
              },
            },
          },
          required: ['festivalName', 'days', 'stages', 'sets'],
        },
      },
    });

    const parsed = JSON.parse(aiRes.text || '{}');
    return res.json({ schedule: parsed });
  } catch (error: any) {
    console.error('Error scraping festival lineup:', error);
    return res.status(500).json({
      error: error.message || 'Failed to extract lineup from web',
    });
  }
});

/**
 * AI schedule extraction from raw text / poster / pasted schedule
 */
app.post('/api/ai-extract-text-schedule', async (req, res) => {
  try {
    const { rawText, festivalNameHint } = req.body;
    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const ai = getGemini();
    const prompt = `You are an expert festival schedule extractor. Extract all stages, days, artists, start times, and end times from this raw text or timetable copy:
Hint / Festival Name: ${festivalNameHint || 'Unknown Festival'}

Input text:
${rawText}

Convert any relative times or formats (e.g. 2:30pm - 3:45pm, 14:30 - 15:45, 23:00 - 00:30) into clean HH:MM 24-hour time strings.
Organize into days and stages properly.`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            festivalName: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  date: { type: Type.STRING },
                },
                required: ['id', 'name'],
              },
            },
            stages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            sets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  artist: { type: Type.STRING },
                  stage: { type: Type.STRING },
                  day: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['artist', 'stage', 'day', 'startTime', 'endTime'],
              },
            },
          },
          required: ['festivalName', 'days', 'stages', 'sets'],
        },
      },
    });

    const parsed = JSON.parse(aiRes.text || '{}');
    return res.json({ schedule: parsed });
  } catch (error: any) {
    console.error('Error extracting text schedule:', error);
    return res.status(500).json({
      error: error.message || 'Failed to extract schedule from text',
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
