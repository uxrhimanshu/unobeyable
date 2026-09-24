// Pure logic for the evaluation harness: no DOM, no storage, no fetch.
// Exported so `test/runner.test.js` can exercise it directly under node:test,
// and so `harness/app.js` can import it for real use in the browser.

export const TASKS = Object.freeze(["printer", "changed", "inspection", "phishing-credential"]);

export const CONDITIONS = Object.freeze({ TODAY: "today", REDESIGN: "redesign" });

/**
 * Balanced condition assignment. For a given task, alternating participants
 * get "today" then "redesign" (offset by the task's position), so across
 * every 2 consecutive participants (0&1, 2&3, ...) each task appears once in
 * each condition. This is a balanced Latin-square rotation over 2 conditions.
 * @param {number} participantIndex 0-based
 * @returns {Record<string, "today"|"redesign">} task id -> condition
 */
export function assignConditions(participantIndex) {
  const out = {};
  TASKS.forEach((task, i) => {
    const parity = (participantIndex + i) % 2;
    out[task] = parity === 0 ? CONDITIONS.TODAY : CONDITIONS.REDESIGN;
  });
  return out;
}

// FNV-1a string hash, used only to seed the PRNG below. Not for anything
// security-sensitive: this is a research-harness shuffle, not a fingerprint.
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: small, deterministic, seedable PRNG. Good enough for shuffling
// four task ids in a browser tab; not cryptographic.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates shuffle seeded from a string (the participant
 * id). Same seed always yields the same order; different seeds are unlikely
 * to collide given the id space, but the point here is reproducibility, not
 * uniqueness.
 */
export function seededShuffle(array, seed) {
  const rand = mulberry32(hashSeed(String(seed)));
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Task order for a participant, shuffled deterministically from their id. */
export function taskOrderFor(participantId) {
  return seededShuffle(TASKS, participantId);
}

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // RFC 4648 base32, no padding

/** "P-" + 6 random base32 characters, e.g. "P-K3F9QZ". */
export function generateParticipantId() {
  let id = "P-";
  for (let i = 0; i < 6; i++) {
    id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return id;
}

function csvField(value) {
  const s = value === undefined || value === null ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * RFC 4180 CSV, using the keys of the first row as the header. Fields
 * containing a comma, quote or newline are quoted, with quotes doubled.
 * Rows are joined with CRLF per RFC 4180.
 */
export function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvField(row[h])).join(","));
  }
  return lines.join("\r\n");
}
