/**
 * Exercise variations are tags on a log entry (spec §4.9). A variant is stored
 * as a sorted list of unique lowercase tags; the machine's default tags are not
 * stored, so "standard flat push-up" and an untagged push-up are the same.
 */

/** Clean a tag: trimmed, lowercase, inner whitespace collapsed. "" if nothing left. */
export function cleanTag(t) {
  return String(t ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Normalise a variant: accepts an array or a "a; b" string; drops blanks, duplicates and `defaults`; sorts. */
export function normalizeVariant(v, defaults = []) {
  const list = Array.isArray(v) ? v : String(v ?? '').split(';');
  const drop = new Set((defaults || []).map(cleanTag));
  return [...new Set(list.map(cleanTag).filter(t => t && !drop.has(t)))].sort();
}

/** True when two variants are the same set of tags (after normalising). */
export function sameVariant(a, b) {
  const x = normalizeVariant(a), y = normalizeVariant(b);
  return x.length === y.length && x.every((t, i) => t === y[i]);
}

/** True when `v` carries every tag in `required` (for goal filters). */
export function hasAllTags(v, required) {
  const have = new Set(normalizeVariant(v));
  return normalizeVariant(required).every(t => have.has(t));
}

/** True when `v` carries any tag in `excluded`. */
export function hasAnyTag(v, excluded) {
  const have = new Set(normalizeVariant(v));
  return normalizeVariant(excluded).some(t => have.has(t));
}

/**
 * Pick tag `tag` in group `group` (one tag per group; a free tag when `group`
 * is empty). Picking the tag already on clears it, back to the plain form.
 * `groups` is the machine's variations object; `defaults` are never stored.
 */
export function pickTag(v, groups, group, tag, defaults = []) {
  const t = cleanTag(tag);
  const cur = normalizeVariant(v, defaults);
  const inGroup = group && groups && Array.isArray(groups[group]) ? groups[group].map(cleanTag) : [];
  const had = cur.includes(t);
  const next = cur.filter(x => x !== t && !inGroup.includes(x));
  if (!had) next.push(t);
  return normalizeVariant(next, defaults);
}

/**
 * Short text for a variant: its tags in the machine's group order, then any
 * free tags, joined by " · " ("incline · wide"). '' for the plain form.
 */
export function variantSummary(v, groups) {
  const tags = normalizeVariant(v);
  const order = Object.values(groups || {}).flat().map(cleanTag);
  const rank = t => { const i = order.indexOf(t); return i < 0 ? order.length : i; };
  return [...tags].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0)).join(' · ');
}
