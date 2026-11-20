/**
 * Log / edit a session. A session is (gym, machine, date); saving replaces
 * it, and changing the date while editing moves it. Each set has its own
 * variation (0.4.0): push-ups can be one set flat, one incline, one decline.
 */
import { S, hasCfg } from '../state.js';
import { html, act, setHTML, setText, on, toast, $, qs, qsa, modal, closeModal, modalOpen } from './dom.js';
import { screen, back, nav } from './nav.js';
import { saveSession } from '../data.js';
import { sessionEntries, lastSession } from '../../lib/log.js';
import { normalizeVariant, cleanTag, pickTag, variantSummary } from '../../lib/variant.js';
import { variationsOf } from '../../lib/gyms.js';
import { columnsFor, rowValues, parseRow, paceText, timeHint } from '../../lib/entryform.js';
import { localDate, localTime, isValidDate } from '../../lib/dates.js';

/** Hooks other screens set: what to do after a save from the plan, and how to prefill from it. */
export const logHooks = { afterPlanLog: null, planSets: null };

const key = date => ({ gym_id: S.gym.id, machine_id: S.machine.id, date });
const groupsOf = () => variationsOf(S.machine);
const defaultsOf = () => (S.machine && S.machine.variations_default) || [];
const hasGroups = () => Object.keys(groupsOf()).length > 0;
const vText = v => normalizeVariant(v).join(';');
const vFrom = s => normalizeVariant(String(s || '').split(';'));

let planIndex = null; // the plan exercise being logged, when logging from the plan

/**
 * Open the form. `editDate` edits that day's session; null starts today's.
 * opts: { variant, fromPlan, planIndex }
 */
export function startLog(editDate, opts = {}) {
  const today = localDate();
  S.fromPlan = !!opts.fromPlan;
  planIndex = opts.planIndex != null ? Number(opts.planIndex) : null;
  S.logVariant = normalizeVariant(opts.variant || [], defaultsOf());
  S.logDate = editDate || today;
  // Starting "today" when today already has this session opens it for editing.
  const exists = sessionEntries(S.log, key(S.logDate)).length > 0;
  S.editSession = editDate || exists ? key(S.logDate) : null;
  S.logRows = null;
  S.logNotes = null;
  S.logShowVar = false;
  nav('log');
}

/** A form row: { values: [one string per column], variant: [tags] }. */
const toRow = (r, t) => (r && Array.isArray(r.values) ? r : { values: rowValues(t, r), variant: normalizeVariant(r && r.variant, defaultsOf()) });

/** The sets to show: typed rows (when re-rendering), the session being edited, the plan, or the last session. */
function prefill() {
  if (S.logRows) return { rows: S.logRows, banner: '' };
  const m = S.machine, today = localDate();
  const plan = S.fromPlan && logHooks.planSets ? logHooks.planSets(S.gym, m, planIndex) : null;
  if (S.editSession) {
    const sets = sessionEntries(S.log, S.editSession);
    // A second stop on the same machine (e.g. incline push-ups after flat ones) adds its sets to today's session.
    if (plan && plan.sets.length && !plan.done) return { rows: [...sets, ...plan.sets], banner: html`<div class="banner">🚂 Sets from today's route added after the ${sets.length} set${sets.length === 1 ? '' : 's'} you already logged${plan.note ? ` — ${plan.note}` : ''}</div>` };
    return { rows: sets, banner: S.editSession.date === today && !S.fromPlan ? html`<div class="banner info">You already logged ${m.name} today. This edits that session.</div>` : '' };
  }
  if (plan && plan.sets.length) return { rows: plan.sets, banner: html`<div class="banner">🚂 Sets pre-filled from today's route${plan.note ? ` — ${plan.note}` : ''}</div>` };
  const last = lastSession(S.log, m.id, S.gym.id);
  return { rows: last && last.length ? last : [{ variant: S.logVariant }], banner: '' };
}

function vCell(v) {
  const s = variantSummary(v, groupsOf());
  return html`<td class="vtd"><button class="vcell ${s ? '' : 'plain'}" ${act('log-vpick')} aria-label="Variation">${s || 'plain'}</button></td>`;
}

function rowHtml(n, row, t, showVar) {
  const cols = columnsFor(t), values = row.values;
  return html`<tr data-v="${vText(row.variant)}"><td>${n}</td>${showVar ? vCell(row.variant) : ''}${cols.map((c, i) => c.kind === 'pace'
    ? html`<td class="pace">${paceText(t, values) || '—'}</td>`
    : html`<td><input type="${c.kind === 'minutes' ? 'text' : 'number'}" ${c.kind === 'minutes' ? html`inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next"` : c.negative ? html`step="any"` : html`inputmode="decimal" step="any"`} data-col="${i}" placeholder="${c.ph}" value="${values[i]}" aria-label="${c.label}"></td>`)}<td><button class="xb" ${act('log-rm-row')} aria-label="Remove set">×</button></td></tr>`;
}

function tableHtml(rows, t, showVar) {
  const cols = columnsFor(t);
  return html`<table class="st"><thead><tr><th>#</th>${showVar ? html`<th>Variation</th>` : ''}${cols.map(c => html`<th>${c.label}</th>`)}<th></th></tr></thead><tbody id="stb">${rows.map((r, i) => rowHtml(i + 1, r, t, showVar))}</tbody></table>`;
}

const showVarFor = rows => hasGroups() || S.logShowVar || rows.some(r => r.variant.length);

function renderLog() {
  const m = S.machine, gym = S.gym;
  if (!m || !gym) return;
  const editing = !!S.editSession, today = localDate(), t = m.log_type || 'weight';
  setText('log-title', editing ? `Edit · ${m.name}` : m.name);
  const { rows: raw, banner } = prefill();
  const rows = raw.map(r => toRow(r, t));
  const showVar = showVarFor(rows);
  const notes = S.logNotes != null ? S.logNotes : editing ? ((raw.find(s => s && s.notes) || {}).notes || '') : '';
  setHTML('logbody', html`${banner}
    <div class="fs"><h3>Date</h3><input type="date" id="ldate" class="fi" value="${S.logDate}" max="${today}"></div>
    <div class="fs"><h3>Sets</h3><div id="swrap">${tableHtml(rows, t, showVar)}</div>${showVar ? html`<p class="hint">Tap a set's variation to change it. A new set copies the one above.</p>` : ''}${timeHint(t) ? html`<p class="hint">${timeHint(t)}</p>` : ''}<button class="ab" ${act('log-add-row')}>＋ Add set</button>${showVar ? '' : html`<button class="ab" ${act('log-show-var')}>＋ Variation</button>`}</div>
    <div class="fs"><h3>Notes</h3><textarea id="lnotes" class="fi" placeholder="How did it feel?">${notes}</textarea></div>
    <button class="btn ok" id="svbtn" ${act('log-save')}>${editing ? 'Save changes' : 'Save session'}</button>
    ${editing ? html`<p class="hint" style="text-align:center">Saving replaces this session. Changing the date moves it.</p>` : ''}`);
}

/** What is in the table now: [{ values, variant }]. */
const typed = () => qsa('#stb tr').map(tr => ({
  values: qsa('input', tr).reduce((a, inp) => { a[+inp.dataset.col] = inp.value; return a; }, columnsFor(S.machine.log_type).map(() => '')),
  variant: vFrom(tr.dataset.v)
}));
function renumber() { qsa('#stb tr').forEach((r, i) => { r.cells[0].textContent = i + 1; }); }

/** Re-render keeping what was typed. */
function rerender() {
  S.logDate = ($('ldate') || {}).value || S.logDate;
  S.logNotes = ($('lnotes') || {}).value ?? null;
  S.logRows = typed();
  renderLog();
}

async function save() {
  if (!hasCfg()) { toast('Set up GitHub in Settings first', 'err'); return; }
  const m = S.machine, gym = S.gym, room = S.room, t = m.log_type || 'weight';
  const date = ($('ldate') || {}).value;
  if (!isValidDate(date)) { toast('Pick a valid date', 'err'); return; }
  const rows = typed();
  const parsed = rows.map(r => parseRow(t, r.values));
  const bad = parsed.find(p => p.error);
  if (bad) { toast(bad.error, 'err'); return; }
  const fields = parsed.map((p, i) => (p.fields ? { ...p.fields, variant: normalizeVariant(rows[i].variant, m.variations_default) } : null)).filter(Boolean);
  if (!fields.length) { toast('Add at least one set with a value', 'err'); return; }
  const from = S.editSession || key(date);
  const to = key(date);
  const existing = sessionEntries(S.log, from);
  const time = (existing[0] && existing[0].time) || localTime();
  const notes = (($('lnotes') || {}).value || '').trim();
  const sets = fields.map((f, i) => ({ ...f, gym: gym.name, room_id: room.id, room: room.name, machine: m.name, time, notes: i === 0 ? notes : '' }));
  try {
    // Shown at once; sent to GitHub in the background (see the save status pill).
    saveSession(from, sets, to, `${S.editSession ? 'Edit' : 'Log'} ${m.name} ${date}`);
    toast('Session saved', 'ok');
    const fromPlan = S.fromPlan;
    S.fromPlan = false; S.editSession = null; S.logRows = null; S.logNotes = null; planIndex = null;
    back();
    if (fromPlan && logHooks.afterPlanLog) logHooks.afterPlanLog();
  } catch (e) {
    if (!e.refused) console.error(e);
    toast(`Save failed: ${e.message}`, 'err');
  }
}

// ---- the per-set variation picker (a modal: one choice per group, plus free tags) ----
let picking = null; // { tr, v }

function pickerHtml() {
  const groups = groupsOf(), v = picking.v;
  const defaults = defaultsOf().map(cleanTag);
  const inGroups = new Set(Object.values(groups).flat().map(cleanTag));
  const extra = v.filter(t => !inGroups.has(t));
  // A group with nothing picked shows its default as selected (defaults are never stored).
  const isOn = (tags, tag) => v.includes(tag) || (defaults.includes(tag) && !tags.map(cleanTag).some(x => v.includes(x)));
  const n = qsa('#stb tr').indexOf(picking.tr) + 1;
  return html`<h2>Variation · set ${n}</h2>
    ${Object.entries(groups).map(([g, tags]) => html`<div class="vg"><span class="vgl">${g}</span>${tags.map(tag => html`<button class="vc ${isOn(tags, cleanTag(tag)) ? 'on' : ''}" ${act('log-vp', { g, t: cleanTag(tag) })}>${tag}</button>`)}</div>`)}
    ${extra.length ? html`<div class="vg">${extra.map(t => html`<button class="vc on" ${act('log-vp', { t })}>${t} ×</button>`)}</div>` : ''}
    <div class="vadd"><input id="vtag" class="fi" type="text" placeholder="Add a tag, e.g. wide" autocapitalize="none" spellcheck="false"><button class="vc" ${act('log-vp-add')}>＋ Tag</button></div>
    <div class="mbs"><button class="mc2" ${act('log-vp-all')}>Use for all sets</button><button class="mo" ${act('log-vp-done')}>Done</button></div>`;
}

/** Show the picker's variant on its row, and redraw the picker. */
function pickerChanged() {
  const tr = picking.tr;
  tr.dataset.v = vText(picking.v);
  const btn = qs('.vcell', tr);
  if (btn) {
    const s = variantSummary(picking.v, groupsOf());
    btn.textContent = s || 'plain';
    btn.classList.toggle('plain', !s);
  }
  $('mdbody').innerHTML = String(pickerHtml());
}

screen('log', renderLog);
on('log-add-row', () => {
  const tb = $('stb');
  if (!tb) return;
  const t = S.machine.log_type || 'weight';
  // A new set copies the set above: its values and its variation.
  const last = typed().pop() || { values: columnsFor(t).map(() => ''), variant: S.logVariant };
  tb.insertAdjacentHTML('beforeend', String(rowHtml(tb.rows.length + 1, last, t, !!qs('.vcell', tb) || showVarFor([last]))));
  renumber();
  const inp = tb.lastElementChild.querySelector('input');
  if (inp) inp.focus();
});
on('log-rm-row', (d, el) => { const tb = el.closest('tbody'); if (tb.rows.length <= 1) return; el.closest('tr').remove(); renumber(); });
on('log-show-var', () => { S.logShowVar = true; rerender(); });
on('log-vpick', (d, el) => {
  const tr = el.closest('tr');
  if (!tr) return;
  picking = { tr, v: vFrom(tr.dataset.v) };
  modal(pickerHtml(), { focus: false }); // no keyboard popping up over the chips
});
on('log-vp', d => {
  if (!picking) return;
  picking.v = pickTag(picking.v, groupsOf(), d.g || '', d.t, defaultsOf());
  pickerChanged();
});
on('log-vp-add', () => {
  if (!picking) return;
  const t = cleanTag(($('vtag') || {}).value);
  if (!t) return;
  if (t.includes(';')) { toast('A tag can\'t contain ";"', 'err'); return; }
  // A typed tag that belongs to a group replaces that group's choice.
  const g = (Object.entries(groupsOf()).find(([, tags]) => tags.map(cleanTag).includes(t)) || [''])[0];
  if (!picking.v.includes(t)) picking.v = pickTag(picking.v, groupsOf(), g, t, defaultsOf());
  pickerChanged();
});
on('log-vp-all', () => {
  if (!picking) return;
  const v = picking.v;
  for (const tr of qsa('#stb tr')) { picking.tr = tr; picking.v = v; pickerChanged(); }
  picking = null;
  closeModal();
});
on('log-vp-done', () => { picking = null; closeModal(); });
on('log-save', save);

// Enter in the tag field adds the tag.
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.id !== 'vtag' || !picking || !modalOpen()) return;
  e.preventDefault();
  const b = qs('[data-act="log-vp-add"]', $('mdbody'));
  if (b) b.click();
});

// Live pace cells and date changes.
document.addEventListener('input', e => {
  const row = e.target.closest && e.target.closest('#stb tr');
  if (!row || !S.machine) return;
  const cell = qs('.pace', row);
  if (!cell) return;
  const t = S.machine.log_type;
  const values = columnsFor(t).map(() => '');
  qsa('input', row).forEach(inp => { values[+inp.dataset.col] = inp.value; });
  cell.textContent = paceText(t, values);
});
document.addEventListener('change', e => {
  if (e.target.id !== 'ldate' || !S.machine || S.editSession) return;
  // A new session on a date that already has one becomes an edit of it.
  S.logDate = e.target.value;
  if (isValidDate(S.logDate) && sessionEntries(S.log, key(S.logDate)).length) {
    S.editSession = key(S.logDate);
    S.logRows = null;
    renderLog();
    toast('That day already has this session: editing it', 'ok');
  }
});
