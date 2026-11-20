/**
 * The workout log (format version 2, docs/DATA-FORMAT.md): an array with one
 * entry per SET, newest date first. Pure functions only.
 *
 * A session is (gym_id, machine_id, date); each set has its own variant
 * (since 0.4.0). Old rows without gym_id match on machine_id alone.
 */
import { toCSV } from './csv.js';
import { normalizeVariant, sameVariant } from './variant.js';

/** CSV columns, in order. `notes` is always last; new columns go before it. */
export const LOG_COLUMNS = [
  'id', 'date', 'time', 'gym_id', 'gym', 'room_id', 'room', 'machine_id', 'machine',
  'variant', 'set', 'weight_lb', 'reps', 'duration_sec', 'duration_min', 'distance_mi', 'speed_mph',
  'level', 'incline_pct', 'hr_avg_bpm', 'garmin_id',
  'zone1_min', 'zone2_min', 'zone3_min', 'zone4_min', 'zone5_min', 'notes'
];

/** Heart-rate zone fields on Garmin-linked rows, in minutes to 2 decimals (docs/DECISIONS.md). */
export const ZONE_FIELDS = ['zone1_min', 'zone2_min', 'zone3_min', 'zone4_min', 'zone5_min'];

/** Round to 2 decimals the way the Garmin pipeline does (half up), so app and Action commits match. */
export const round2 = x => Math.round(x * 100) / 100;

/** Seconds → minutes to 2 decimals (104 → 1.73); null when blank. */
export const minFromSec = v => (v == null || v === '' || isNaN(+v) ? null : round2(+v / 60));

/**
 * Seconds in zone i (1–5) of an entry, or null. Reads `zone{i}_min`; rows written
 * before 0.2.1 had `zone{i}_sec`, which is still accepted.
 */
export function zoneSeconds(e, i) {
  if (!e) return null;
  const m = e[`zone${i}_min`];
  if (m != null && m !== '' && !isNaN(+m)) return Math.round(+m * 600) / 10; // 2-decimal minutes × 60, without float noise
  const s = e[`zone${i}_sec`];
  return s != null && s !== '' && !isNaN(+s) ? +s : null;
}

/** The measurement fields each machine log_type records. */
export const LOG_TYPE_FIELDS = {
  weight: ['weight_lb', 'reps'],
  reps: ['reps'],
  time: ['duration_sec'],
  mins: ['duration_sec'],
  cardio: ['duration_sec', 'speed_mph', 'incline_pct', 'distance_mi', 'hr_avg_bpm'],
  pace: ['duration_sec', 'speed_mph', 'level', 'distance_mi', 'hr_avg_bpm'],
  walk: ['distance_mi', 'duration_sec', 'hr_avg_bpm']
};

/** Every measurement field, across all log types. */
export const MEASURE_FIELDS = [...new Set(Object.values(LOG_TYPE_FIELDS).flat())];

let seq = 0;
/** Short unique id for a new entry. */
export function newId(now = Date.now(), rand = Math.random) {
  seq = (seq + 1) % 1296;
  const r = Math.floor(rand() * 46656).toString(36).padStart(3, '0');
  return `e${now.toString(36)}${r}${seq.toString(36).padStart(2, '0')}`;
}

/**
 * True when entry `e` belongs to session `s` = { gym_id, machine_id, date }.
 * Since 0.4.0 the variant is per set and not part of the session. A key that
 * still carries `variant` (an operation queued by an older version of the app
 * and sent after the update) keeps its old meaning: only rows with that variant.
 */
export function inSession(e, s) {
  if (!e || e.machine_id !== s.machine_id || e.date !== s.date) return false;
  if (s.gym_id && e.gym_id && e.gym_id !== s.gym_id) return false;
  return s.variant === undefined || sameVariant(e.variant, s.variant);
}

/**
 * Sort a session's rows by set number. A day logged before 0.4.0 as two
 * variant sessions has each numbered from 1; those rows are grouped by variant
 * (in log order) so they read as before. The next save numbers them 1..n.
 */
export function sortSets(rows) {
  const list = [...(rows || [])];
  const nums = list.map(e => e.set || 0);
  if (new Set(nums).size === nums.length) return list.sort((a, b) => (a.set || 0) - (b.set || 0));
  const first = new Map();
  list.forEach(e => { const k = normalizeVariant(e.variant).join(';'); if (!first.has(k)) first.set(k, first.size); });
  const g = e => first.get(normalizeVariant(e.variant).join(';'));
  return list.sort((a, b) => g(a) - g(b) || (a.set || 0) - (b.set || 0));
}

/** Entries of one session, in set order. */
export function sessionEntries(log, s) {
  return sortSets((log || []).filter(e => inSession(e, s)));
}

/** Newest date first; stable within a date. */
export function sortLog(log) {
  return [...(log || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** The session key of `s`: gym, machine and date (and the variant only for an old-style key). */
function sessionKey(s) {
  const k = { gym_id: s.gym_id, machine_id: s.machine_id, date: s.date };
  if (s.variant !== undefined) k.variant = normalizeVariant(s.variant);
  return k;
}

/**
 * Replace a session. Removes every entry of session `from` and inserts
 * `newSets` as session `to` (default: `from`). So saving never appends, and
 * changing the date while editing MOVES the session. If `to` already has
 * entries (same machine and date), they are replaced too.
 *
 * Each set carries its own `variant` (sorted tags; [] = plain), so one session
 * can hold flat, incline and decline push-ups. A set without a `variant` field
 * keeps the variant of the entry it replaces (or the old-style key's variant).
 *
 * Each new set is laid over the existing entry with the same index, so fields
 * the form doesn't know (id, garmin_id, anything a later version adds)
 * survive. The form must pass every measurement field it shows, using null
 * for a cleared value.
 *
 * `newSets` may be empty, which deletes the session.
 */
export function mergeSession(log, from, newSets, to = from) {
  const src = sessionKey(from), target = sessionKey(to);
  const existing = sessionEntries(log, src);
  const rest = (log || []).filter(e => !inSession(e, src) && !inSession(e, target));
  const merged = (newSets || []).map((s, i) => {
    const out = { ...(existing[i] || {}), ...s };
    out.set = i + 1;
    out.date = target.date;
    out.machine_id = target.machine_id;
    if (target.gym_id) out.gym_id = target.gym_id;
    out.variant = normalizeVariant(s && 'variant' in s ? s.variant : target.variant !== undefined ? target.variant : out.variant);
    if (!out.id) out.id = newId();
    return out;
  });
  // Insert after the last entry of the same date, else before the first older date.
  let at = -1;
  rest.forEach((e, i) => { if (e.date === target.date) at = i + 1; });
  if (at < 0) { at = rest.findIndex(e => e.date < target.date); if (at < 0) at = rest.length; }
  return [...rest.slice(0, at), ...merged, ...rest.slice(at)];
}

/**
 * Move a session to another machine (e.g. a Garmin session posted to the wrong
 * gym). `to` = { gym_id, gym, room_id, room, machine_id, machine }. Every field
 * is kept (garmin_id, zones, notes, each set's variant); the date stays. If the
 * target machine already has a session that day, the moved sets are added
 * after its sets instead of replacing them.
 */
export function moveSession(log, from, to) {
  const src = sessionKey(from);
  const moving = sessionEntries(log, src);
  if (!moving.length) return log;
  if (to.gym_id === src.gym_id && to.machine_id === src.machine_id) return log;
  const target = { gym_id: to.gym_id, machine_id: to.machine_id, date: src.date };
  const ids = new Set(moving.map(e => e.id));
  const already = sessionEntries(log, target).filter(e => !ids.has(e.id)).length;
  const moved = new Map(moving.map((e, i) => [e.id, { ...e, ...to, set: already + i + 1 }]));
  // Keep each moved row where it was in the log; only its machine changes.
  return (log || []).map(e => (ids.has(e.id) ? moved.get(e.id) : e));
}

/** Remove a session entirely. */
export function removeSession(log, s) {
  const k = sessionKey(s);
  return (log || []).filter(e => !inSession(e, k));
}

function onMachine(log, machineId, gymId) {
  return (log || []).filter(e => e.machine_id === machineId && (!gymId || !e.gym_id || e.gym_id === gymId));
}

/**
 * The most recent session on a machine, for pre-filling the log form: every
 * set of the latest day, each with its own variant. Returns them in set order,
 * or null.
 */
export function lastSession(log, machineId, gymId) {
  const all = onMachine(log, machineId, gymId);
  if (!all.length) return null;
  const date = all.map(e => e.date).sort().pop();
  return sortSets(all.filter(e => e.date === date));
}

/** Sessions on a machine, newest first: [{ date, sets }], one per day; each set has its own variant. */
export function machineSessions(log, machineId, gymId) {
  return sessionDates(log, machineId, gymId)
    .map(date => ({ date, sets: sessionEntries(log, { gym_id: gymId, machine_id: machineId, date }) }));
}

/** Distinct dates (newest first) a machine was logged. */
export function sessionDates(log, machineId, gymId) {
  return [...new Set(onMachine(log, machineId, gymId).map(e => e.date))].sort().reverse();
}

const GARMIN_TAG = /Garmin(?:\s+[a-z]+)?\s+(\d{9,})/i;

/** The Garmin activity id an entry is linked to: `garmin_id`, else a "Garmin <id>" tag in the notes. */
export function garminIdOf(e) {
  if (!e) return null;
  if (e.garmin_id != null && e.garmin_id !== '') return String(e.garmin_id);
  const m = GARMIN_TAG.exec(e.notes || '');
  return m ? m[1] : null;
}

/**
 * One entry as its CSV row: `duration_min` is computed from `duration_sec` (export
 * only, never stored), and zone minutes come from `zone{i}_sec` on older rows.
 */
export function csvRow(e) {
  const r = { ...e, duration_min: minFromSec(e.duration_sec) };
  for (let i = 1; i <= 5; i++) {
    if (r[`zone${i}_min`] == null) { const s = zoneSeconds(e, i); r[`zone${i}_min`] = s == null ? null : round2(s / 60); }
  }
  return r;
}

/** The CSV export of a log (same order as the JSON). */
export function logToCSV(log) {
  return toCSV((log || []).map(csvRow), LOG_COLUMNS);
}

/** The JSON text of a log, as committed. */
export function logToJSON(log) {
  return JSON.stringify(log || [], null, 2) + '\n';
}
