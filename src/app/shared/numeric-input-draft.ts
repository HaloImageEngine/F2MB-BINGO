/** String shown in a numeric text/number input while the user is typing. */
export function numericDraftFromValue(value: number | null | undefined): string {
  return value != null && Number.isFinite(value) ? String(value) : '';
}

/** Parse a committed positive integer from draft text (empty/invalid → null). */
export function parsePositiveInteger(draft: string, options?: { max?: number }): number | null {
  const trimmed = draft.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  if (options?.max !== undefined && parsed > options.max) {
    return null;
  }

  return parsed;
}
