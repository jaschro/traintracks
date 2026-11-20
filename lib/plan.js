/**
 * Today's Plan (suggested-workout.json, written by the coach). Pure helpers.
 *
 * { generated_at, coach_note,
 *   exercises: [ { machine_id, gym_id?, machine, gym, room, variant?,
 *                  sets: [ { set, weight_lb, reps, duration_sec, distance_mi, speed_mph, incline_pct, level, variant? } ], note } ] }
 *
 * Variations are per set (0.4.0): an exercise's `variant` applies to each of
 * its sets, and a set's own `variant` wins over it.
 *
 * The file is written by an LLM, so it is untrusted: values are checked here
 * and everything shown goes through the escaping html template.
 */
import { normalizeVariant, sameVariant } from './variant.js';
import { fmtSet } from './format.js';

const PLAN_SET_FIELDS = ['weight_lb', 'reps', 'duration_sec', 'distance_mi', 'speed_mph', 'incline_pct', 'level', 'hr_avg_bpm'];

/** Keep only known numeric set fields with finite numbers. */
export function cleanPlanSet(s) {
  const out = {};
  if (!s || typeof s !== 'object') return out;
  for (const f of PLAN_SET_FIELDS) {
    const v = s[f];
    if (v == null || v === '') continue;
    const n = Number(v);
    if (isFinite(n)) out[f] = n;
  }
  return out;
}

/** The (gym, room, machine) a plan exercise refers to, or null. gym_id wins; otherwise the first gym with that machine id. */
export function resolveExercise(gyms, ex) {
  if (!ex || !ex.machine_id) return null;
  for (const g of gyms || []) {
    if (ex.gym_id && g.id !== ex.gym_id) continue;
    for (const r of g.rooms || []) {
      const m = (r.machines || []).find(x => x.id === ex.machine_id);
      if (m) return { gym: g, room: r, machine: m };
    }
  }
  return null;
}

/**
 * Is a plan exercise logged today? A set on the same machine (and gym, if
 * given); with a variant, a set with that variant. `defaults` are the
 * machine's default tags (never stored), so a planned "flat" matches a plain set.
 */
export function exerciseDone(ex, log, today, defaults = []) {
  const want = normalizeVariant(ex.variant, defaults);
  const planned = ex.variant != null && normalizeVariant(ex.variant).length > 0;
  return (log || []).some(e => e.date === today && e.machine_id === ex.machine_id
    && (!ex.gym_id || !e.gym_id || e.gym_id === ex.gym_id)
    && (!planned || sameVariant(normalizeVariant(e.variant, defaults), want)));
}

/** { done, total, doneIdx: Set of exercise indexes }. `gyms` (optional) supplies each machine's default tags. */
export function planStatus(plan, log, today, gyms) {
  const ex = (plan && Array.isArray(plan.exercises)) ? plan.exercises : [];
  const defaultsOf = e => { const f = gyms ? resolveExercise(gyms, e) : null; return (f && f.machine.variations_default) || []; };
  const doneIdx = new Set(ex.map((e, i) => (e && exerciseDone(e, log, today, defaultsOf(e)) ? i : -1)).filter(i => i >= 0));
  return { done: doneIdx.size, total: ex.length, doneIdx };
}

/** "60 lb × 12, 80 lb × 10"; a set with its own variant adds it: "15 reps (incline)". */
export function fmtPlanSets(sets) {
  return (Array.isArray(sets) ? sets : []).map(s => {
    const c = cleanPlanSet(s);
    if (!Object.keys(c).length) return '';
    const v = s.variant != null ? planVariant(s.variant) : [];
    return fmtSet(c) + (v.length ? ` (${v.join(', ')})` : '');
  }).filter(Boolean).join(', ');
}

/** A plan's variant value (untrusted): a list or "a; b" string of tags, else []. */
const planVariant = v => (Array.isArray(v) || typeof v === 'string' ? normalizeVariant(v.filter ? v.filter(t => typeof t === 'string') : v) : []);

/**
 * Rows for the log form from a plan exercise. Each row carries a `variant`:
 * the set's own, else the exercise's, minus the machine's `defaults`.
 */
export function prefillFromPlan(ex, defaults = []) {
  const exV = planVariant(ex && ex.variant);
  return (ex && Array.isArray(ex.sets) ? ex.sets : []).map(s => {
    const own = s && typeof s === 'object' && (Array.isArray(s.variant) || typeof s.variant === 'string') ? planVariant(s.variant) : null;
    return { ...cleanPlanSet(s), variant: normalizeVariant(own || exV, defaults) };
  });
}

/** Problems with a plan file (empty = fine). */
export function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') return ['not an object'];
  const problems = [];
  if (!Array.isArray(plan.exercises)) problems.push('exercises is not a list');
  (Array.isArray(plan.exercises) ? plan.exercises : []).forEach((e, i) => {
    if (!e || typeof e !== 'object') { problems.push(`exercise ${i + 1} is not an object`); return; }
    if (!e.machine_id) problems.push(`exercise ${i + 1} has no machine_id`);
    if (e.sets != null && !Array.isArray(e.sets)) problems.push(`exercise ${i + 1}: sets is not a list`);
  });
  return problems;
}
