// Erzeugt die Screenshots für die Präsentation "Projektstatus".
//
// Liest die Seitenliste aus hugo/data/status.yaml (screens) und legt die Bilder in
// hugo/content/status/screens/ ab. Details: README.md in diesem Ordner.
//
//   node screenshots.mjs --host-pin 12345 [--seed] [--base http://localhost:4200]

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import YAML from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
const hugoDir = path.resolve(here, '..', '..');
const dataFile = path.join(hugoDir, 'data', 'status.yaml');
const outDir = path.join(hugoDir, 'content', 'status', 'screens');

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

// Seiten, die als Host (mit Host-PIN im localStorage) bzw. als Gast geöffnet werden.
const HOST_ROUTES = new Set(['/select-playlist', '/dashboard', '/startpage', '/voting-host', '/search-host']);
const GUEST_ROUTES = new Set(['/voting', '/guest']);

const SEED_QUERIES = ['Daft Punk', 'Queen', 'Adele', 'Coldplay', 'Dua Lipa'];
const GUEST_DEVICE_ID = 'screenshot-guest';

// Das Spotify Web Playback SDK wird blockiert: sonst registriert der unsichtbare Chrome ein
// eigenes Wiedergabegerät und zieht die Musik der Party auf sich. Der Player zeigt trotzdem
// den Stand aus dem Backend.
const BLOCKED_URLS = ['sdk.scdn.co'];

function parseArgs(argv) {
  const args = {
    base: 'http://localhost:4200',
    chrome: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    wait: 3500,
    seed: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--host-pin') args.hostPin = argv[++i];
    else if (a === '--base') args.base = argv[++i].replace(/\/$/, '');
    else if (a === '--chrome') args.chrome = argv[++i];
    else if (a === '--wait') args.wait = Number(argv[++i]);
    else if (a === '--only') args.only = argv[++i].split(',');
    else if (a === '--seed') args.seed = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unbekanntes Argument: ${a}`);
  }
  return args;
}

async function api(base, method, url, body, hostPin) {
  const headers = { 'Content-Type': 'application/json' };
  if (hostPin) headers.Authorization = `Bearer ${hostPin}`;
  const res = await fetch(`${base}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok && res.status !== 409) {
    throw new Error(`${method} ${url} → HTTP ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function resolveParty(base, hostPin) {
  const party = await api(base, 'GET', `/api/party/host-join/${encodeURIComponent(hostPin)}`);
  return { id: party.id, pin: party.guestPin, hostPin };
}

// Füllt die Warteschlange mit ein paar Songs und Likes, damit die Screenshots nicht leer sind.
async function seedQueue(base, party) {
  const uris = [];
  for (const q of SEED_QUERIES) {
    const result = await api(base, 'GET', `/api/party/${party.id}/track/search?q=${encodeURIComponent(q)}`);
    const first = result?.tracks?.items?.find(Boolean);
    if (first?.uri) uris.push(first.uri);
  }
  for (const uri of uris) {
    await api(base, 'POST', `/api/party/${party.id}/track/addToPlaylist`, [uri]);
  }
  // Unterschiedlich viele Likes, damit die Sortierung sichtbar wird.
  for (const [i, uri] of uris.entries()) {
    for (let v = 0; v < uris.length - i - 1; v++) {
      await api(base, 'POST', `/api/party/${party.id}/track/vote`, { uri, deviceId: `screenshot-seed-${v}` });
    }
  }
  // Der Screenshot-Gast liked selbst einen Song, damit ein gefülltes Herz zu sehen ist.
  if (uris[1]) {
    await api(base, 'POST', `/api/party/${party.id}/track/vote`, { uri: uris[1], deviceId: GUEST_DEVICE_ID });
  }
  console.log(`Seed: ${uris.length} Songs hinzugefügt.`);
}

async function newContext(browser, base, storage) {
  const context = await browser.createBrowserContext();
  if (storage) {
    const page = await context.newPage();
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((entries) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
    }, storage);
    await page.close();
  }
  return context;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.hostPin) {
    console.log('Aufruf: node screenshots.mjs --host-pin <PIN> [--seed] [--base URL] [--only a.png,b.png] [--wait ms] [--chrome PATH]');
    process.exit(args.help ? 0 : 1);
  }

  const data = YAML.parse(await fs.readFile(dataFile, 'utf8'));
  const screens = (data.screens || []).filter((s) => !args.only || args.only.includes(s.file));
  await fs.mkdir(outDir, { recursive: true });

  const party = await resolveParty(args.base, args.hostPin);
  console.log(`Party ${party.id} (Gast-PIN ${party.pin})`);
  if (args.seed) await seedQueue(args.base, party);

  const browser = await puppeteer.launch({
    executablePath: args.chrome,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  });

  try {
    const neutral = await newContext(browser, args.base, {});
    const host = await newContext(browser, args.base, {
      mv_party_id: party.id,
      mv_party_pin: party.pin,
      mv_party_host_pin: party.hostPin,
    });
    const guest = await newContext(browser, args.base, {
      mv_party_id: party.id,
      mv_party_pin: party.pin,
      mv_device_id: GUEST_DEVICE_ID,
    });

    for (const screen of screens) {
      const context = HOST_ROUTES.has(screen.route) ? host : GUEST_ROUTES.has(screen.route) ? guest : neutral;
      const page = await context.newPage();
      await page.setViewport(VIEWPORTS[screen.device] || VIEWPORTS.desktop);
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (BLOCKED_URLS.some((u) => req.url().includes(u))) req.abort();
        else req.continue();
      });

      const url = new URL(`${args.base}${screen.route}`);
      if (HOST_ROUTES.has(screen.route)) url.searchParams.set('partyId', party.id);

      // Kein networkidle: die SSE-Verbindung bleibt offen, deshalb feste Wartezeit.
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, args.wait));

      // Optional: Suchbegriff eintippen (Feld `search` in status.yaml).
      if (screen.search) {
        await page.type('input[type="search"]', screen.search);
        await page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, args.wait));
      }

      const file = path.join(outDir, screen.file);
      await page.screenshot({ path: file });
      console.log(`✓ ${screen.file}  (${screen.route}, ${screen.device})`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\nFertig. Jetzt in hugo/data/status.yaml das Datum "stand" aktualisieren.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
