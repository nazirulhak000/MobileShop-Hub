/**
 * The public tracking API (/api/track/[code]) accepts:
 * 1. A 64-hex security token (from QR code or secure URL link), or
 * 2. A repair job tracking code (e.g. REP-202611-0001 from physical receipt),
 * either as a bare code or extracted from a full pasted URL.
 */
export function extractTrackingToken(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // 1. Extract from full or relative URL (/track/<code-or-token>)
  const fromUrl = raw.match(/\/track\/([a-zA-Z0-9_-]{4,64})(?:[/?#]|$)/);
  if (fromUrl) {
    const val = fromUrl[1].trim();
    return /^[a-fA-F0-9]{64}$/.test(val) ? val.toLowerCase() : val;
  }

  // 2. 64-character hexadecimal security token
  if (/^[a-fA-F0-9]{64}$/.test(raw)) {
    return raw.toLowerCase();
  }

  // 3. Repair Job tracking code (e.g. REP-202611-0001 or alphanumeric ticket ID)
  if (/^[A-Za-z0-9_-]{4,32}$/.test(raw)) {
    return raw.trim();
  }

  return null;
}

export const TRACKING_INPUT_ERROR = "กรุณาสแกน QR หรือระบุรหัสติดตามจากใบรับเครื่อง (เช่น REP-202611-0001)";
