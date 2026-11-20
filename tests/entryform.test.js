import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORM_COLUMNS, columnsFor, rowValues, parseRow, paceText, timeHint } from '../lib/entryform.js';
import { LOG_TYPE_FIELDS } from '../lib/log.js';

test('every form field is a field of that log type', () => {
  for (const [t, cols] of Object.entries(FORM_COLUMNS)) {
    for (const c of cols) if (c.field) assert.ok(LOG_TYPE_FIELDS[t].includes(c.field), `${t}.${c.field}`);
  }
});

test('unknown log type falls back to weight & reps', () => assert.equal(columnsFor('zzz'), FORM_COLUMNS.weight));

test('weight: negative weight (assistance) is allowed', () => {
  assert.deepEqual(parseRow('weight', ['-100', '10']).fields, { weight_lb: -100, reps: 10 });
});

test('negative values elsewhere are rejected', () => {
  assert.match(parseRow('weight', ['50', '-3']).error, /Reps can't be negative/);
  assert.match(parseRow('walk', ['-1', '30']).error, /negative/);
});

test('reps must be whole numbers', () => assert.match(parseRow('reps', ['2.5']).error, /whole number/));

test('blank row → null fields, no error; blanks inside a row are null', () => {
  assert.deepEqual(parseRow('weight', ['', '']), { fields: null, error: null });
  assert.deepEqual(parseRow('weight', ['', '20']).fields, { weight_lb: null, reps: 20 });
});

test('minutes columns accept "30", "32:45" and "1:05:00" → seconds', () => {
  assert.equal(parseRow('mins', ['45']).fields.duration_sec, 2700);
  assert.equal(parseRow('walk', ['1.5', '32:45']).fields.duration_sec, 1965);
  assert.equal(parseRow('cardio', ['1:05:00', '', '', '']).fields.duration_sec, 3900);
  assert.match(parseRow('mins', ['5:6']).error, /valid time/);
});

test('time (planks) is entered in seconds', () => assert.deepEqual(parseRow('time', ['60']).fields, { duration_sec: 60 }));

test('cardio row', () => {
  assert.deepEqual(parseRow('cardio', ['30', '3.3', '4', '118']).fields, { duration_sec: 1800, speed_mph: 3.3, incline_pct: 4, hr_avg_bpm: 118 });
});

test('pace column is display only', () => {
  assert.deepEqual(parseRow('pace', ['30', '3', 'whatever']).fields, { duration_sec: 1800, speed_mph: 3 });
});

test('rubbish is an error naming the column', () => assert.match(parseRow('weight', ['abc', '5']).error, /Weight \(lb\)/));

test('rowValues: stored sets back into the form', () => {
  assert.deepEqual(rowValues('weight', { weight_lb: -85, reps: 7 }), ['-85', '7']);
  assert.deepEqual(rowValues('walk', { distance_mi: 2.2, duration_sec: 2640 }), ['2.2', '44', '']);
  assert.deepEqual(rowValues('mins', { duration_sec: 1965 }), ['32:45']);
  assert.deepEqual(rowValues('cardio', {}), ['', '', '', '']);
  assert.deepEqual(rowValues('reps', null), ['']);
});

test('round trip: rowValues → parseRow keeps the values', () => {
  const set = { duration_sec: 1965, speed_mph: 3.25, incline_pct: 2.5, hr_avg_bpm: 121 };
  assert.deepEqual(parseRow('cardio', rowValues('cardio', set)).fields, set);
});

test('paceText', () => {
  assert.equal(paceText('walk', ['1.5', '30']), '20:00/mi');
  assert.equal(paceText('pace', ['30', '3']), '20:00/mi');
  assert.equal(paceText('walk', ['', '30']), '—');
  assert.equal(paceText('weight', ['1', '2']), '');
});

test('every time column is labelled "Time" with an mm:ss placeholder', () => {
  for (const t of ['walk', 'pace', 'cardio', 'mins']) {
    const c = FORM_COLUMNS[t].find(c => c.kind === 'minutes');
    assert.equal(c.label, 'Time', t);
    assert.equal(c.ph, 'mm:ss', t);
    assert.match(timeHint(t), /mm:ss/);
  }
  assert.equal(timeHint('weight'), '');
  assert.equal(timeHint('time'), '');
});

test('walk: "70:46" → 4246 s; "1:10:46", "70.77" and whole minutes too', () => {
  assert.deepEqual(parseRow('walk', ['3.1', '70:46']).fields, { distance_mi: 3.1, duration_sec: 4246 });
  assert.equal(parseRow('walk', ['3.1', '1:10:46']).fields.duration_sec, 4246);
  assert.equal(parseRow('walk', ['3.1', '70.77']).fields.duration_sec, 4246);
  assert.equal(parseRow('walk', ['3.1', '30']).fields.duration_sec, 1800);
  for (const t of ['pace', 'cardio', 'mins']) assert.equal(parseRow(t, ['70:46', '', '', '']).fields.duration_sec, 4246, t);
});

test('an impossible time is the typed-value error, not a different time', () => {
  const r = parseRow('walk', ['3.1', '70:99']);
  assert.equal(r.fields, null);
  assert.match(r.error, /^Time: "70:99" is not a valid time \(mm:ss/);
  assert.match(parseRow('cardio', ['1:75:00', '', '', '']).error, /valid time/);
});

test('editing shows a saved time back as mm:ss / h:mm:ss', () => {
  assert.deepEqual(rowValues('walk', { distance_mi: 3.1, duration_sec: 4246 }), ['3.1', '1:10:46', '']);
  assert.deepEqual(rowValues('pace', { duration_sec: 1965, speed_mph: 3 }), ['32:45', '3', '']);
});

test('pace from a typed mm:ss time', () => {
  assert.equal(paceText('walk', ['3', '45:00', '']), paceText('walk', ['3', '45', '']));
  assert.notEqual(paceText('walk', ['3.1', '70:46', '']), '');
  assert.equal(paceText('walk', ['3.1', '70:99', '']), paceText('walk', ['3.1', '', '']));
});
