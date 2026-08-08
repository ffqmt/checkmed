export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function weightedPick<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    if (r < item.weight) return item.value;
    r -= item.weight;
  }
  return items[items.length - 1].value;
}

/** Simulated latency for a mocked async integration call. */
export async function simulateLatency(minMs = 250, maxMs = 900) {
  const ms = randomInt(minMs, maxMs);
  await new Promise((resolve) => setTimeout(resolve, ms));
}
