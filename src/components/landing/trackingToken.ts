/**
 * The public tracking API (/api/track/[code]) only accepts a 64-hex token, which the
 * customer receives as a QR code / link on the repair receipt (…/track/<token>).
 * Accepts either the bare token or a full pasted URL and returns the normalised token,
 * or null when the input is not a valid tracking link.
 */
export function extractTrackingToken(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const fromUrl = raw.match(/\/track\/([a-fA-F0-9]{64})(?:[/?#]|$)/);
  if (fromUrl) return fromUrl[1].toLowerCase();
  if (/^[a-fA-F0-9]{64}$/.test(raw)) return raw.toLowerCase();
  return null;
}

export const TRACKING_INPUT_ERROR = "กรุณาสแกน QR หรือเปิดลิงก์จากใบรับเครื่อง";
