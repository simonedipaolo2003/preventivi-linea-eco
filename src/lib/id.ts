let counter = 0;

/** Lightweight unique id for quote rows (stable within a session). */
export function uid(prefix = 'row'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}
