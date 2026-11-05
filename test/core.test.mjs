// Fixtures: test/fixtures/i-bond-rate-chart-2026-11.json holds every fixed rate and every composite rate printed in the
// TreasuryDirect Series I rate chart effective November 1, 2026 (fetched 2026-11-05, 1,711 cells). The TreasuryDirect
// "I bonds interest rates" page was saved the same day. Value fixtures are hand-checked arithmetic per $25 unit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import {
  INFLATION, FIXED, LATEST, ANNOUNCEMENTS, compositeRate, announcementFor, parseMonth, parseRatesPage, unitValue,
  getCurrentIBondRate, getIBondRateForIssueDate, estimateIBondValue, calculateCompositeRate, getIBondRateHistory, InputError, UTM,
} from '../dist/core.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const chart = JSON.parse(fx('i-bond-rate-chart-2026-11.json'));
const NOV5 = Date.UTC(2026, 10, 5, 12);

test('latest announcement November 2026: fixed 1.40, semiannual inflation 2.04, composite 5.51', () => {
  assert.equal(LATEST, '2026-11'); assert.equal(FIXED['2026-11'], 1.4); assert.equal(INFLATION['2026-11'], 2.04);
  assert.equal(compositeRate(1.4, 2.04), 5.51); assert.equal(ANNOUNCEMENTS.length, 58);
});
test('TreasuryDirect worked example: 0.0140 + 0.0408 + 0.0002856 = 0.0550856, rounds to 5.51%', () => {
  const r = calculateCompositeRate({ fixed_rate: 1.4, semiannual_inflation_rate: 2.04 });
  assert.equal(r.unrounded_percent, 5.50856); assert.equal(r.composite_rate, 5.51);
});
test('every fixed rate in the chart matches the built-in table (58 issue periods)', () => {
  assert.equal(Object.keys(chart.fixed).length, 58);
  for (const [k, v] of Object.entries(chart.fixed)) assert.equal(FIXED[k], v, k);
});
test('formula reproduces all 1,711 composite rates printed in the chart', () => {
  let n = 0;
  for (const [issue, row] of Object.entries(chart.composite)) {
    row.forEach((v, i) => { assert.equal(compositeRate(chart.fixed[issue], INFLATION[chart.columns[i]]), v, `${issue} ${chart.columns[i]}`); n++; });
  }
  assert.equal(n, 1711);
});
test('deflation floors: May 2015 (-0.80) gives 0.00 at fixed 0 and 0.38 at fixed 2.00; Nov 2008 (-2.78) gives 0.00 at fixed 3.40', () => {
  assert.equal(compositeRate(0, -0.8), 0); assert.equal(compositeRate(2.0, -0.8), 0.38); assert.equal(compositeRate(3.4, -2.78), 0);
  assert.match(calculateCompositeRate({ fixed_rate: 0, semiannual_inflation_rate: -0.8 }).summary, /never lets the composite go below zero/);
});
test('the record 9.62 percent: a 0.00 fixed bond in the May 2022 period (inflation 4.81)', () => {
  assert.equal(compositeRate(0, 4.81), 9.62); assert.equal(announcementFor('2022-10'), '2022-05'); assert.equal(announcementFor('1998-10'), '1998-09');
  assert.throws(() => announcementFor('1998-08'), InputError);
});
test('months: YYYY-MM and YYYY-MM-DD accepted, bad month rejected', () => {
  assert.equal(parseMonth('2023-1'), '2023-01'); assert.equal(parseMonth('2023-01-15'), '2023-01'); assert.throws(() => parseMonth('2023-13'), InputError);
});
test('live page parse: 5.51 percent, fixed 1.40, inflation 2.04, issued 2026-11 to 2027-04', () => {
  assert.deepEqual(parseRatesPage(fx('td-i-bonds-interest-rates.html')), { composite: 5.51, fixed: 1.4, inflation: 2.04, from: '2026-11', to: '2027-04' });
  assert.equal(parseRatesPage('<html>maintenance</html>'), null);
});
test('current rate: live page, fallback when the page fails, next announcement May 1 2027', async () => {
  const live = await getCurrentIBondRate(async () => fx('td-i-bonds-interest-rates.html'), NOV5);
  assert.equal(live.composite_rate, 5.51); assert.equal(live.rate_source, 'live TreasuryDirect page'); assert.equal(live.next_rate_announcement, '2027-05-01');
  assert.equal(live.table_mismatch, null); assert.ok(live.more.includes(UTM));
  const down = await getCurrentIBondRate(async () => { throw new Error('HTTP 403'); }, NOV5);
  assert.equal(down.composite_rate, 5.51); assert.equal(down.fixed_rate, 1.4); assert.equal(down.rate_source, 'built-in TreasuryDirect rate chart'); assert.match(down.live_check, /403/);
});
test('bond issued 2023-01: fixed 0.40, earns 3.75 Jul-Dec 2026, schedule matches chart row', () => {
  const r = getIBondRateForIssueDate({ issue_month: '2023-01', as_of_month: '2026-11' });
  assert.equal(r.fixed_rate, 0.4); assert.equal(r.current_period.composite_rate, 3.75); assert.equal(r.current_period.period_start, '2026-07');
  assert.deepEqual(r.periods.map((p) => p.composite_rate), [6.89, 3.79, 4.35, 3.37, 2.3, 3.27, 3.53, 3.75]);
  assert.deepEqual(r.rate_changes_in, ['January', 'July']); assert.equal(r.penalty_if_cashed_now, 'loses the last 3 months of interest');
});
test('bond issued 2022-05 (fixed 0.00): 9.62 first period, 4.08 from November 2026', () => {
  const r = getIBondRateForIssueDate({ issue_month: '2022-05', as_of_month: '2026-12' });
  assert.equal(r.periods[0].composite_rate, 9.62); assert.equal(r.current_period.composite_rate, 4.08);
});
test('future issue month without announced rates is rejected; 30-year bond reports matured', () => {
  assert.throws(() => getIBondRateForIssueDate({ issue_month: '2027-05', as_of_month: '2027-05' }), /not announced/);
  assert.match(getIBondRateForIssueDate({ issue_month: '1998-09', as_of_month: '2028-10' }).summary, /no longer earns interest/);
});
test('value: $10,000 issued 2023-01 is $11,596 in November 2026, $11,488 after the 3-month penalty (hand-checked per $25)', () => {
  assert.equal(unitValue('2023-01', '2023-07'), 25.86); assert.equal(unitValue('2023-01', '2026-07'), 28.63);
  const r = estimateIBondValue({ issue_month: '2023-01', amount: 10000, as_of_month: '2026-11' });
  assert.equal(r.months_held, 46); assert.equal(r.value_with_all_interest, 11596); assert.equal(r.redemption_value, 11488); assert.equal(r.interest_earned, 1596);
});
test('value: under 12 months cannot be cashed; amount under $25 rejected', () => {
  assert.equal(estimateIBondValue({ issue_month: '2026-05', amount: 1000, as_of_month: '2026-11' }).redemption_value, null);
  assert.throws(() => estimateIBondValue({ issue_month: '2026-05', amount: 10 }), InputError);
});
test('history: newest first, 58 rows max, highest fixed rate 3.60 in May 2000', () => {
  const h = getIBondRateHistory({ limit: 60 });
  assert.equal(h.count, 58); assert.equal(h.rows[0].announcement, '2026-11'); assert.equal(h.rows[0].composite_rate_new_bonds, 5.51);
  assert.equal(h.rows[57].announcement, '1998-09'); assert.match(h.summary, /3\.60% \(May 2000\)/);
});
test('stdio: initialize, tools/list and an offline tools/call over JSON-RPC', async () => {
  const child = spawn(process.execPath, [new URL('../dist/stdio.js', import.meta.url).pathname], { stdio: ['pipe', 'pipe', 'ignore'] });
  const lines = []; let buf = '';
  const got = (id) => new Promise((res) => { const iv = setInterval(() => { const m = lines.find((l) => l.id === id); if (m) { clearInterval(iv); res(m); } }, 10); });
  child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
  const send = (m) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');
  send({ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  assert.equal((await got(1)).result.serverInfo.name, 'i-bond-rate-mcp');
  send({ method: 'notifications/initialized' });
  send({ id: 2, method: 'tools/list' });
  assert.deepEqual((await got(2)).result.tools.map((t) => t.name), ['get_current_i_bond_rate', 'get_i_bond_rate_for_issue_date', 'estimate_i_bond_value', 'calculate_i_bond_composite_rate', 'get_i_bond_rate_history']);
  send({ id: 3, method: 'tools/call', params: { name: 'calculate_i_bond_composite_rate', arguments: { fixed_rate: 1.4, semiannual_inflation_rate: 2.04 } } });
  assert.equal((await got(3)).result.structuredContent.composite_rate, 5.51);
  child.kill();
});
