/**
 * Helpers for surfacing Supabase / network errors as proper Error instances.
 *
 * Supabase returns errors as plain objects (`{ message, code, details, hint }`)
 * that stringify to `[object Object]`. Wrap them with `toError` at the throw
 * site so React Query downstreams see `.message` populated. `describeError`
 * goes the other way — for any caught value, return a readable line.
 */

export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (value === null || value === undefined) return new Error('Unknown error');
  if (typeof value === 'string') return new Error(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const message =
      (typeof obj.message === 'string' && obj.message) ||
      (typeof obj.error_description === 'string' && obj.error_description) ||
      JSON.stringify(obj);
    const err = new Error(message);
    if (typeof obj.code === 'string') (err as Error & { code?: string }).code = obj.code;
    return err;
  }
  return new Error(String(value));
}

export function describeError(value: unknown): string {
  return toError(value).message;
}
