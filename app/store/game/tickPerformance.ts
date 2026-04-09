/**
 * Tick performance tracker using a fixed-size ring buffer.
 *
 * Records elapsed time per phase label. Every LOG_INTERVAL ticks,
 * prints a console.table with the rolling average, min and max over
 * the last WINDOW_SIZE samples.
 *
 * Usage:
 *   TickPerf.tickStart();           // call once at the very start of tick()
 *   TickPerf.start('[tick] foo');   // replaces console.time(...)
 *   TickPerf.end('[tick] foo');     // replaces console.timeEnd(...)
 *   TickPerf.logIfNeeded();         // call once at the very end of tick()
 */

const WINDOW_SIZE = 96;
const LOG_INTERVAL = 48;

// Insertion order is preserved in Map, which gives us stable table row order.
const buffers = new Map<string, Float64Array>();
const heads = new Map<string, number>();
const counts = new Map<string, number>();
const startTimes = new Map<string, number>();

let tickCount = 0;

// Labels are registered lazily on first start() call.
function getOrCreate(label: string): void {
  if (!buffers.has(label)) {
    buffers.set(label, new Float64Array(WINDOW_SIZE));
    heads.set(label, 0);
    counts.set(label, 0);
  }
}

export const TickPerf = {
  /** Call once at the very beginning of tick(). */
  tickStart(): void {
    tickCount++;
  },

  /** Record the start time for a phase. */
  start(label: string): void {
    startTimes.set(label, performance.now());
  },

  /** Record the elapsed time for a phase into the ring buffer. */
  end(label: string): void {
    const t = performance.now() - (startTimes.get(label) ?? performance.now());
    getOrCreate(label);

    const buf = buffers.get(label)!;
    const head = heads.get(label)!;
    buf[head] = t;
    heads.set(label, (head + 1) % WINDOW_SIZE);

    const count = counts.get(label)!;
    if (count < WINDOW_SIZE) counts.set(label, count + 1);
  },

  /** Call once at the very end of tick(). Prints stats every LOG_INTERVAL ticks. */
  logIfNeeded(): void {
    if (tickCount % LOG_INTERVAL !== 0) return;

    const rows: Record<string, { 'avg ms': string; 'min ms': string; 'max ms': string; samples: number }> = {};

    for (const [label, buf] of buffers) {
      const n = counts.get(label) ?? 0;
      if (n === 0) continue;

      let sum = 0;
      let min = Infinity;
      let max = -Infinity;

      for (let i = 0; i < n; i++) {
        const v = buf[i];
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
      }

      rows[label] = {
        'avg ms': (sum / n).toFixed(3),
        'min ms': min.toFixed(3),
        'max ms': max.toFixed(3),
        samples: n,
      };
    }

    console.log(`[TickPerf] rolling stats (last ${WINDOW_SIZE} ticks, tick #${tickCount})`);
    console.table(rows);
  },
};
