/** Gym → rooms → machine grid → machine detail (history). */
import { S } from '../state.js';
import { html, act, setHTML, setText, on, toast, $, confirmDialog, modal, closeModal } from './dom.js';
import { screen, nav } from './nav.js';
import { imageUrl, deleteSession, moveSessionTo, moveEntriesTo, deleteEntries } from '../data.js';
import { visibleCount, variationsOf } from '../../lib/gyms.js';
import { lastSession, machineSessions, garminIdOf, zoneSeconds } from '../../lib/log.js';
import { zonesFromBuckets, cleanFloors } from '../../lib/goals.js';
import { variantSummary } from '../../lib/variant.js';
import { fmtLast, fmtSet, fmtDateFull, fmtClock } from '../../lib/format.js';
import { localDate } from '../../lib/dates.js';
import { startLog } from './logform.js';

export function openGym(gid) {
  const g = S.gyms.find(x => x.id === gid);
  if (!g) return;
  S.gym = g;
  if (g.rooms.length === 1) { S.room = g.rooms[0]; nav('machines'); } else nav('rooms');
}

function renderRooms() {
  if (!S.gym) return;
  setText('rooms-title', S.gym.name);
  setHTML('roomsbody', html`<div class="card" style="margin-top:12px">${S.gym.rooms.map(r => html`<div class="row" ${act('open-room', { id: r.id })}><div class="tx"><h2>${r.name}</h2></div><span class="meta">${visibleCount(r)} machines</span><span class="ch">›</span></div>`)}</div>`);
}

/** Fill <img data-img="gymId|file"> elements; fall back to an icon if the image can't load. */
export function hydrateImages(root) {
  (root || document).querySelectorAll('img[data-img]').forEach(img => {
    const [gymId, file] = img.dataset.img.split('|');
    delete img.dataset.img;
    const url = imageUrl(S.gyms.find(g => g.id === gymId), file);
    if (!url) { img.parentElement.textContent = '🏋️'; return; }
    img.addEventListener('error', () => { if (img.parentElement) img.parentElement.textContent = '🏋️'; }, { once: true });
    img.src = url;
  });
}

export function imgBox(gym, m, cls) {
  return m.image ? html`<div class="${cls}"><img data-img="${gym.id}|${m.image}" alt="${m.name}" loading="lazy"></div>` : html`<div class="${cls}">🏋️</div>`;
}

function renderMachines() {
  if (!S.gym || !S.room) return;
  setText('machines-title', S.gym.rooms.length > 1 ? S.room.name : S.gym.name);
  const vis = S.room.machines.filter(m => !m.hidden);
  const today = localDate();
  const grid = $('mgrid');
  grid.innerHTML = vis.length ? vis.map(m => {
    const ls = lastSession(S.log, m.id, S.gym.id);
    const lh = ls ? html`<div class="ml">${fmtLast(ls, today)}</div>` : html`<div class="mn0">No sessions yet</div>`;
    return html`<button class="mc" ${act('open-machine', { id: m.id })}>${imgBox(S.gym, m, 'mi')}<div class="mn"><h3>${m.name}</h3>${lh}</div></button>`;
  }).join('') : html`<div class="empty" style="grid-column:1/-1"><div class="icon">🪑</div><p>No machines in this room yet.<br>Add some in Settings → Manage equipment.</p></div>`;
  hydrateImages(grid);
}

/** Heart-rate zones for a Garmin-linked session, from the bucket file and the zone floors in goals.json. */
function zoneRow(sets) {
  const id = sets.map(garminIdOf).find(Boolean);
  const row = id && S.buckets[id];
  const fl = cleanFloors(S.goals && S.goals.hr_zones_bpm);
  if (row && fl.length) {
    const z = zonesFromBuckets(row, fl);
    const parts = z.zones.map((v, i) => `Z${i + 1} ${v > 0 ? fmtClock(v) : '—'}`);
    if (z.below > 0) parts.unshift(`below Z1 ${fmtClock(z.below)}`);
    return html`<div class="zr">${parts.join(' · ')}${row.hr_avg_bpm ? ` · avg ${row.hr_avg_bpm} bpm` : ''}</div>`;
  }
  const f = sets[0] || {};
  const zs = [1, 2, 3, 4, 5].map(i => zoneSeconds(f, i));
  if (!zs.some(v => v != null)) return '';
  return html`<div class="zr">${zs.map((v, i) => `Z${i + 1} ${v != null ? fmtClock(v) : '—'}`).join(' · ')}</div>`;
}

/** A set's tags in the machine's group order. */
const variantOrder = v => variantSummary(v, variationsOf(S.machine)).split(' · ').filter(Boolean);
const chips = v => (v && v.length ? html`<span class="vchips">${v.map(t => html`<span class="vchip">${t}</span>`)}</span>` : '');

/**
 * A set with its own Move and Delete: a Garmin-linked entry (one activity) in a
 * session of more than one set. Hand-logged sets are changed through the
 * session's Edit form; a one-set session has the session's own buttons.
 */
const single = (sets, x) => sets.length > 1 && !!x.id && !!garminIdOf(x);
const clock = t => String(t).slice(0, 5);
const findEntry = id => (S.log || []).find(e => e && e.id === id);

export function renderDetail() {
  const m = S.machine, gym = S.gym;
  if (!m || !gym) return;
  setText('detail-title', m.name);
  const sessions = machineSessions(S.log, m.id, gym.id);
  const shown = sessions.slice(0, S.historyAll ? 500 : 6);
  const hist = shown.length ? shown.map(s => {
    const notes = (s.sets.find(x => x.notes) || {}).notes || '';
    // Sets of a day logged before 0.4.0 as two variant sessions are numbered by position here.
    return html`<div class="hi"><div class="hd"><span>${fmtDateFull(s.date)}</span><div class="ha"><button class="ib" ${act('move-session', { date: s.date })} title="Move to another machine" aria-label="Move to another machine">↪️</button><button class="ib" ${act('edit-session', { date: s.date })} title="Edit" aria-label="Edit">✏️</button><button class="ib danger" ${act('del-session', { date: s.date })} title="Delete" aria-label="Delete">🗑️</button></div></div>
      ${s.sets.map((x, i) => html`<div class="sr"><span class="sn">Set ${i + 1}</span><span class="sv">${chips(variantOrder(x.variant))}${single(s.sets, x) && x.time ? html`<span class="st">${clock(x.time)}</span>` : ''}${fmtSet(x)}</span>${single(s.sets, x) ? html`<span class="sa"><button class="ib sm" ${act('move-entry', { id: x.id })} title="Move this activity" aria-label="Move this activity">↪️</button><button class="ib sm danger" ${act('del-entry', { id: x.id })} title="Delete this activity" aria-label="Delete this activity">🗑️</button></span>` : ''}</div>`)}
      ${zoneRow(s.sets)}
      ${notes ? html`<div class="hn">“${notes}”</div>` : ''}</div>`;
  }) : html`<div class="empty" style="padding:28px 24px"><div class="icon">📋</div><p>No sessions logged yet.</p></div>`;
  const more = sessions.length > shown.length ? html`<button class="btn ghost" ${act('history-more')}>Show all ${sessions.length} sessions</button>` : '';
  setHTML('detailbody', html`${imgBox(gym, m, 'hero')}<div class="dm"><h2>${m.name}</h2>${m.muscles_worked ? html`<p class="mu">${m.muscles_worked}</p>` : ''}</div>
    <button class="btn" ${act('start-log')}>Log today</button>
    <div class="sh">History</div>${hist}${more}`);
  hydrateImages($('detailbody'));
}

export function openMachine(mid, gymId) {
  const gym = gymId ? S.gyms.find(g => g.id === gymId) : S.gym;
  if (!gym) return false;
  for (const r of gym.rooms) {
    const m = r.machines.find(x => x.id === mid);
    if (m) { S.gym = gym; S.room = r; S.machine = m; S.historyAll = false; nav('detail'); return true; }
  }
  return false;
}

screen('rooms', renderRooms);
screen('machines', renderMachines);
screen('detail', renderDetail);

on('open-room', d => { const r = S.gym.rooms.find(x => x.id === d.id); if (r) { S.room = r; nav('machines'); } });
on('open-machine', d => openMachine(d.id));
on('start-log', () => startLog(null));
on('edit-session', d => startLog(d.date));
on('history-more', () => { S.historyAll = true; renderDetail(); });
on('del-session', async d => {
  const ok = await confirmDialog('Delete session?', `${S.machine.name} on ${fmtDateFull(d.date)} will be removed from your log.`, { ok: 'Delete', danger: true });
  if (!ok) return;
  try {
    const s = { gym_id: S.gym.id, machine_id: S.machine.id, date: d.date };
    deleteSession(s, `Delete ${S.machine.name} ${d.date}`);
    toast('Session deleted', 'ok');
    renderDetail();
  } catch (e) { toast(`Delete failed: ${e.message}`, 'err'); }
});

// ---- move a session, or one activity of it, to another machine (e.g. a Garmin walk posted to the wrong gym) ----
// moving = { kind: 'session', from } or { kind: 'entry', id, date }
let moving = null;
function openMove(what, desc) {
  moving = what;
  // Start on a machine with the same name in another gym (the usual fix), else the first one.
  const same = String(S.machine.name || '').trim().toLowerCase();
  let picked = false;
  const groups = S.gyms.map(g => {
    const opts = [];
    for (const r of g.rooms) for (const m of r.machines) {
      if (m.hidden || (g.id === S.gym.id && m.id === S.machine.id)) continue;
      const sel = !picked && String(m.name || '').trim().toLowerCase() === same;
      if (sel) picked = true;
      opts.push(html`<option value="${g.id}|${r.id}|${m.id}" ${sel ? 'selected' : ''}>${m.name}${g.rooms.length > 1 ? ` (${r.name})` : ''}</option>`);
    }
    return opts.length ? html`<optgroup label="${g.name}">${opts}</optgroup>` : '';
  });
  modal(html`<h2>Move to another machine</h2><p class="mdp">${desc}</p>
    <div class="mr"><label for="mvto">Move to</label><select id="mvto">${groups}</select></div>
    <div class="mbs"><button class="mc2" ${act('modal-close')}>Cancel</button><button class="mo" ${act('move-session-do')}>Move</button></div>`);
}
on('move-session', d => {
  openMove({ kind: 'session', from: { gym_id: S.gym.id, machine_id: S.machine.id, date: d.date } },
    `${S.machine.name}, ${fmtDateFull(d.date)}. Everything in the session moves with it, including its Garmin link.`);
});
on('move-entry', d => {
  const e = findEntry(d.id);
  if (!e) return;
  const at = e.time ? ` at ${clock(e.time)}` : '';
  openMove({ kind: 'entry', id: e.id, date: e.date },
    `${S.machine.name}, ${fmtDateFull(e.date)}${at}. Only this activity moves, with its Garmin link, heart rate and notes; the other sets that day stay here.`);
});
on('move-session-do', async () => {
  const [gid, rid, mid] = String(($('mvto') || {}).value || '').split('|');
  const g = S.gyms.find(x => x.id === gid), r = g && g.rooms.find(x => x.id === rid), m = r && r.machines.find(x => x.id === mid);
  if (!m || !moving) return;
  closeModal();
  const to = { gym_id: g.id, gym: g.name, room_id: r.id, room: r.name, machine_id: m.id, machine: m.name };
  try {
    const w = moving;
    if (w.kind === 'entry') moveEntriesTo([w.id], to, `Move one ${S.machine.name} ${w.date} to ${m.name}`);
    else moveSessionTo(w.from, to, `Move ${S.machine.name} ${w.from.date} to ${m.name}`);
    toast(`Moved to ${m.name} (${g.name})`, 'ok');
    renderDetail();
  } catch (e) { toast(`Move failed: ${e.message}`, 'err'); }
  finally { moving = null; }
});
on('del-entry', async d => {
  const e = findEntry(d.id);
  if (!e) return;
  const at = e.time ? ` at ${clock(e.time)}` : '';
  const ok = await confirmDialog('Delete this activity?', `${S.machine.name} on ${fmtDateFull(e.date)}${at} will be removed from your log. The other sets that day stay. A Garmin activity from the last few weeks is posted again by the next Garmin run; to keep it, move it instead.`, { ok: 'Delete', danger: true });
  if (!ok) return;
  try {
    deleteEntries([e.id], `Delete one ${S.machine.name} ${e.date}`);
    toast('Activity deleted', 'ok');
    renderDetail();
  } catch (err) { toast(`Delete failed: ${err.message}`, 'err'); }
});
