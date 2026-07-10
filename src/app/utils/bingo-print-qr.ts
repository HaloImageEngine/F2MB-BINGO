/** Builds a scannable QR image URL from text (used when no custom image is uploaded). */
export function buildQrCodeImageUrl(text: string, size = 120): string {
  const payload = text.trim() || 'https://getgogi.com';
  const pixels = Math.max(80, Math.min(size, 300));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${pixels}x${pixels}&data=${encodeURIComponent(payload)}`;
}

export type BingoPrintQrSlotIndex = 0 | 1 | 2;
