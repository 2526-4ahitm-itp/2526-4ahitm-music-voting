/**
 * Contrast check over the design tokens (task 5.5, design D9, web-ui spec
 * "Text Meets WCAG AA Contrast").
 *
 * Reads the real token values from styles.css in dark and light mode and
 * checks every text colour against every surface it sits on. The brand glow
 * behind the stage is not a flat colour, so the test rebuilds its radial
 * gradients (same geometry as shared/stage.css and startpage.css) and samples
 * them on a grid over phone, desktop and TV screens. The blur is ignored,
 * which only removes peaks, so the result errs on the strict side.
 *
 * Thresholds: 4.5:1 for host and guest pages; 3:1 on the TV page, whose text
 * is large (dashboard spec: queue rows ≥ 32px, footer ≥ 24px).
 */

type Rgba = [number, number, number, number];

/** Parses `#RRGGBB` or `rgb(a)(r, g, b[, a])`. */
function parse(value: string): Rgba {
  const v = value.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v);
  if (rgb) {
    return [+rgb[1], +rgb[2], +rgb[3], rgb[4] === undefined ? 1 : +rgb[4]];
  }
  throw new Error(`Cannot parse colour "${value}"`);
}

/** Paints `top` (straight alpha) over an opaque `bottom`. */
function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top[3];
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------- Glow model ----------

const PURPLE = (a: number): Rgba => [132, 3, 166, a];
const CORAL = (a: number): Rgba => [242, 89, 75, a];
const CLEAR: Rgba = [0, 0, 0, 0];

/** One `radial-gradient(rx ry at cx cy, …stops)`; sizes in vw/vh, centre in %. */
interface Radial {
  rx: number; ry: number; cx: number; cy: number;
  stops: { at: number; color: Rgba }[];
}

/** The four corner glows of `.host-stage::before` (shared/stage.css). */
const HOST_CORNERS: Radial[] = [
  { rx: 60, ry: 70, cx: 18, cy: 30, stops: [{ at: 0, color: PURPLE(0.7) }, { at: 0.7, color: CLEAR }] },
  { rx: 55, ry: 60, cx: 40, cy: 100, stops: [{ at: 0, color: CORAL(0.45) }, { at: 0.7, color: CLEAR }] },
  { rx: 50, ry: 65, cx: 95, cy: 85, stops: [{ at: 0, color: CORAL(0.35) }, { at: 0.7, color: CLEAR }] },
  { rx: 45, ry: 55, cx: 88, cy: 5, stops: [{ at: 0, color: PURPLE(0.45) }, { at: 0.7, color: CLEAR }] },
];

/** `--mv-stage-center-glow` per theme (styles.css); checked against the token below. */
const CENTRE: Record<'dark' | 'light', Radial> = {
  dark: { rx: 55, ry: 50, cx: 50, cy: 50, stops: [{ at: 0, color: PURPLE(0.5) }, { at: 0.55, color: CORAL(0.22) }, { at: 0.8, color: CLEAR }] },
  light: { rx: 60, ry: 55, cx: 50, cy: 50, stops: [{ at: 0, color: PURPLE(0.3) }, { at: 0.55, color: CORAL(0.18) }, { at: 0.85, color: CLEAR }] },
};

/** The TV's `.glow` (startpage.css). */
const TV_GLOW: Radial[] = [
  { rx: 60, ry: 70, cx: 22, cy: 38, stops: [{ at: 0, color: PURPLE(0.85) }, { at: 0.7, color: CLEAR }] },
  { rx: 55, ry: 60, cx: 40, cy: 95, stops: [{ at: 0, color: CORAL(0.6) }, { at: 0.7, color: CLEAR }] },
  { rx: 50, ry: 65, cx: 92, cy: 85, stops: [{ at: 0, color: CORAL(0.45) }, { at: 0.7, color: CLEAR }] },
  { rx: 45, ry: 55, cx: 85, cy: 10, stops: [{ at: 0, color: PURPLE(0.5) }, { at: 0.7, color: CLEAR }] },
];

/** Colour of one gradient at a point, interpolated in premultiplied space like CSS. */
function sample(g: Radial, x: number, y: number, w: number, h: number): Rgba {
  const dx = (x - (g.cx / 100) * w) / ((g.rx / 100) * w);
  const dy = (y - (g.cy / 100) * h) / ((g.ry / 100) * h);
  const t = Math.hypot(dx, dy);
  const last = g.stops[g.stops.length - 1];
  if (t >= last.at) return last.color;
  let i = 0;
  while (g.stops[i + 1].at < t) i++;
  const a = g.stops[i], b = g.stops[i + 1];
  const f = (t - a.at) / (b.at - a.at);
  const alpha = a.color[3] + (b.color[3] - a.color[3]) * f;
  if (alpha <= 0) return CLEAR;
  const ch = (k: number) => (a.color[k] * a.color[3] + (b.color[k] * b.color[3] - a.color[k] * a.color[3]) * f) / alpha;
  return [ch(0), ch(1), ch(2), alpha];
}

/** Background at a point: layers (first listed on top) × layer opacity, over the stage colour. */
function glowAt(layers: Radial[], opacity: number, stage: Rgba, x: number, y: number, w: number, h: number): Rgba {
  // Composite the layers into one premultiplied colour, bottom layer first.
  let pr = 0, pg = 0, pb = 0, pa = 0;
  for (const layer of [...layers].reverse()) {
    const [r, g, b, a] = sample(layer, x, y, w, h);
    pr = r * a + pr * (1 - a); pg = g * a + pg * (1 - a); pb = b * a + pb * (1 - a); pa = a + pa * (1 - a);
  }
  if (pa === 0) return stage;
  return over([pr / pa, pg / pa, pb / pa, pa * opacity], stage);
}

/** All glow colours on a 41×41 grid over the given screens. */
function glowSamples(layers: Radial[], opacity: number, stage: Rgba, screens: [number, number][]): Rgba[] {
  const out: Rgba[] = [];
  for (const [w, h] of screens) {
    for (let i = 0; i <= 40; i++) {
      for (let j = 0; j <= 40; j++) {
        out.push(glowAt(layers, opacity, stage, (i / 40) * w, (j / 40) * h, w, h));
      }
    }
  }
  return out;
}

const PHONE_AND_DESKTOP: [number, number][] = [[390, 844], [1440, 900]];
const TV: [number, number][] = [[1920, 1080]];

describe('Design tokens meet WCAG AA contrast', () => {
  afterEach(() => {
    document.documentElement.dataset['theme'] = 'dark';
  });

  function tokens(theme: 'dark' | 'light') {
    document.documentElement.dataset['theme'] = theme;
    const css = getComputedStyle(document.documentElement);
    const get = (name: string) => css.getPropertyValue(name).trim();
    return { get, color: (name: string) => parse(get(name)) };
  }

  /** Lowest contrast of `ink` over all samples, with the sample that produced it. */
  function worst(ink: Rgba, backgrounds: Rgba[]): { ratio: number; bg: Rgba } {
    let result = { ratio: Infinity, bg: backgrounds[0] };
    for (const bg of backgrounds) {
      const ratio = contrast(ink, bg);
      if (ratio < result.ratio) result = { ratio, bg };
    }
    return result;
  }

  const fmt = (c: Rgba) => `rgb(${c.slice(0, 3).map(Math.round).join(', ')})`;

  for (const theme of ['dark', 'light'] as const) {
    describe(`${theme} mode`, () => {
      it('the centre glow model matches the --mv-stage-center-glow token', () => {
        const token = tokens(theme).get('--mv-stage-center-glow').replace(/\s+/g, ' ');
        const c = CENTRE[theme];
        expect(token).toContain(`${c.rx}vw ${c.ry}vh`);
        for (const s of c.stops.slice(0, 2)) {
          expect(token).toContain(`, ${s.color[3]})`);
        }
      });

      /** Glow samples for host and guest pages, plus the given fills painted over them. */
      function hostSurfaces(t: ReturnType<typeof tokens>, fills: string[]): Record<string, Rgba[]> {
        const stage = t.color('--mv-stage');
        const glow = glowSamples([CENTRE[theme], ...HOST_CORNERS], parseFloat(t.get('--mv-stage-glow')), stage, PHONE_AND_DESKTOP);
        const out: Record<string, Rgba[]> = { glow };
        for (const f of fills) out[f] = glow.map((g) => over(t.color(f), g));
        return out;
      }

      function expectAtLeast(ink: Rgba, label: string, surfaces: Record<string, Rgba[]>, min: number) {
        for (const [name, bgs] of Object.entries(surfaces)) {
          const w = worst(ink, bgs);
          expect(w.ratio).withContext(`${label} on ${name} (worst at ${fmt(w.bg)}: ${w.ratio.toFixed(2)})`).toBeGreaterThanOrEqual(min);
        }
      }

      // Where each text colour is used: muted and accent text sit on the glow
      // itself or on cards, rows and the top bar. Translucent chips and
      // secondary buttons directly on the glow (tint-2) carry full ink only.
      it('host and guest pages: --mv-on-stage reaches 4.5:1 on the glow, cards, rows, bars and chips', () => {
        const t = tokens(theme);
        expectAtLeast(t.color('--mv-on-stage'), '--mv-on-stage',
          hostSurfaces(t, ['--mv-stage-card', '--mv-stage-row', '--mv-stage-bar', '--mv-stage-tint-2']), 4.5);
      });

      for (const text of ['--mv-on-stage-muted', '--mv-stage-accent']) {
        it(`host and guest pages: ${text} reaches 4.5:1 on the glow, cards, rows and bars`, () => {
          const t = tokens(theme);
          expectAtLeast(t.color(text), text, hostSurfaces(t, ['--mv-stage-card', '--mv-stage-row', '--mv-stage-bar']), 4.5);
        });
      }

      it('guest voting: the heart icon reaches 3:1 (non-text) on its button inside the song card', () => {
        const t = tokens(theme);
        const cards = hostSurfaces(t, ['--mv-stage-card'])['--mv-stage-card'];
        const button = t.color('--mv-stage-tint-2');
        expectAtLeast(t.color('--mv-stage-accent'), 'heart icon', { 'like button on card': cards.map((c) => over(button, c)) }, 3);
      });

      it('TV page: all text tokens reach 3:1 (large text) on the TV glow', () => {
        const t = tokens(theme);
        const stage = t.color('--mv-stage');
        const opacity = parseFloat(t.get('--mv-stage-tv-glow') || t.get('--mv-stage-glow'));
        const glow = glowSamples(TV_GLOW, opacity, stage, TV);
        for (const text of ['--mv-on-stage', '--mv-on-stage-muted', '--mv-stage-accent']) {
          const w = worst(t.color(text), glow);
          expect(w.ratio).withContext(`${text} on TV glow (worst at ${fmt(w.bg)}: ${w.ratio.toFixed(2)})`).toBeGreaterThanOrEqual(3);
        }
      });

      it('white text reaches 4.5:1 on the filled buttons (purple, danger, coral-deep)', () => {
        const t = tokens(theme);
        const white = t.color('--mv-on-accent');
        for (const fill of ['--mv-purple', '--mv-danger', '--mv-coral-deep']) {
          expect(contrast(white, t.color(fill))).withContext(`on-accent on ${fill}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    });
  }

  it('the contrast helper matches known WCAG values', () => {
    expect(contrast([0, 0, 0, 1], [255, 255, 255, 1])).toBeCloseTo(21, 1);
    expect(contrast([118, 118, 118, 1], [255, 255, 255, 1])).toBeCloseTo(4.54, 1);
  });
});
