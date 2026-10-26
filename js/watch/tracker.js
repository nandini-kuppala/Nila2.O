// The watch's eye for movement, with no model at all. Each frame is shrunk to a
// 64×48 grey grid and compared with the one before: cells that changed are
// movement, and their centre is where the baby is moving. When most of the grid
// changes at once, it was the phone that moved, not the baby.

export const GRID_W = 64;
export const GRID_H = 48;

/** RGBA pixels (already at grid size) → grey values. */
export function toGray(rgba, w = GRID_W, h = GRID_H) {
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  return g;
}

export function inZone(pt, zone) {
  return pt.x >= zone.x && pt.x <= zone.x + zone.w && pt.y >= zone.y && pt.y <= zone.y + zone.h;
}

export const DEFAULT_ZONE = { x: 0.2, y: 0.18, w: 0.6, h: 0.64 };

export class Tracker {
  constructor({ w = GRID_W, h = GRID_H, diff = 28 } = {}) {
    this.w = w;
    this.h = h;
    this.diff = diff;
    this.prev = null;
  }

  /** → { fg, centroid: {x,y} | null, change, box } — fg is the share of the frame that moved */
  update(gray) {
    const { w, h } = this;
    if (!this.prev) {
      this.prev = Float32Array.from(gray);
      return { fg: 0, centroid: null, change: 0, box: null };
    }
    let moved = 0, sx = 0, sy = 0;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (Math.abs(gray[i] - this.prev[i]) > this.diff) {
          moved++;
          sx += x;
          sy += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    this.prev = Float32Array.from(gray);
    const n = w * h;
    return {
      fg: moved / n,
      change: moved / n,
      centroid: moved ? { x: (sx / moved + 0.5) / w, y: (sy / moved + 0.5) / h } : null,
      box: moved ? { x: minX / w, y: minY / h, w: (maxX - minX + 1) / w, h: (maxY - minY + 1) / h } : null,
    };
  }

  reset() {
    this.prev = null;
  }
}

/**
 * Turns readings into alerts, with a short debounce so one stray frame does not
 * wake anybody, and a cooldown so one event is not ten alerts.
 *   reading: { fg, centroid, change, person? } ; person = {x,y} centre of a detected person
 *   → array of { alert: 'zone' | 'moved', severity, text }
 */
export function createAlerter({ debounceMs = 900, cooldownMs = 20000, minFg = 0.001 } = {}) {
  // Movement comes and goes frame to frame, so the last place she was seen
  // stands until she is seen somewhere else.
  let outsideSince = null;
  let sightings = 0;
  const last = { zone: -Infinity, moved: -Infinity };
  return {
    check(reading, zone, t) {
      const out = [];
      if (reading.change > 0.45) {
        outsideSince = null;
        sightings = 0;
        if (t - last.moved > cooldownMs) {
          last.moved = t;
          out.push({ alert: 'moved', severity: 'attention', text: 'The phone was moved, so the view may no longer show the cot.' });
        }
        return out;
      }
      const where = reading.person || (reading.fg >= minFg ? reading.centroid : null);
      if (!where) return out;
      if (inZone(where, zone)) {
        outsideSince = null;
        sightings = 0;
        return out;
      }
      outsideSince ??= t;
      sightings++;
      if (sightings >= 2 && t - outsideSince >= debounceMs && t - last.zone > cooldownMs) {
        last.zone = t;
        out.push({ alert: 'zone', severity: 'urgent', text: reading.person ? 'A person is outside the safe zone.' : 'Movement outside the safe zone.' });
      }
      return out;
    },
  };
}
