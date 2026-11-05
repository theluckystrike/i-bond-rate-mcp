// Pure core for i-bond-rate-mcp. Fixed and semiannual inflation rates are copied from the TreasuryDirect
// Series I rate chart (i-bond-rate-chart.pdf, effective November 1, 2026, fetched 2026-11-05). The only I/O is an
// optional keyless read of the TreasuryDirect "I bonds interest rates" page, done through an injected fetchText.
import type { FetchText } from './types.js';

export const REPO = 'i-bond-rate-mcp';
export const SITE = 'https://www.mcpstamp.com';
export const UTM = `utm_source=mcp&utm_medium=${REPO}`;
export const AS_OF = '2026-11-05';
export const RATES_PAGE = 'https://www.treasurydirect.gov/savings-bonds/i-bonds/i-bonds-interest-rates/';
export const RATE_CHART = 'https://www.treasurydirect.gov/files/savings-bonds/i-bond-rate-chart.pdf';
export const I_BONDS_PAGE = 'https://www.treasurydirect.gov/savings-bonds/i-bonds/';
export const more = () => `${SITE}/servers/?${UTM}`;

export class InputError extends Error {}
export class UpstreamError extends Error {}

/** Semiannual inflation rate (percent) by announcement month, and the fixed rate for bonds issued from that month. */
export const INFLATION: Record<string, number> = {
  '1998-09': 0.62, '1998-11': 0.86, '1999-05': 0.86, '1999-11': 1.76, '2000-05': 1.91, '2000-11': 1.52, '2001-05': 1.44, '2001-11': 1.19, '2002-05': 0.28, '2002-11': 1.23, '2003-05': 1.77, '2003-11': 0.54, '2004-05': 1.19, '2004-11': 1.33, '2005-05': 1.79, '2005-11': 2.85, '2006-05': 0.5, '2006-11': 1.55, '2007-05': 1.21, '2007-11': 1.53, '2008-05': 2.42, '2008-11': 2.46, '2009-05': -2.78, '2009-11': 1.53, '2010-05': 0.77, '2010-11': 0.37, '2011-05': 2.3, '2011-11': 1.53, '2012-05': 1.1, '2012-11': 0.88, '2013-05': 0.59, '2013-11': 0.59, '2014-05': 0.92, '2014-11': 0.74, '2015-05': -0.8, '2015-11': 0.77, '2016-05': 0.08, '2016-11': 1.38, '2017-05': 0.98, '2017-11': 1.24, '2018-05': 1.11, '2018-11': 1.16, '2019-05': 0.7, '2019-11': 1.01, '2020-05': 0.53, '2020-11': 0.84, '2021-05': 1.77, '2021-11': 3.56, '2022-05': 4.81, '2022-11': 3.24, '2023-05': 1.69, '2023-11': 1.97, '2024-05': 1.48, '2024-11': 0.95, '2025-05': 1.43, '2025-11': 1.56, '2026-05': 1.67, '2026-11': 2.04,
};
export const FIXED: Record<string, number> = {
  '1998-09': 3.4, '1998-11': 3.3, '1999-05': 3.3, '1999-11': 3.4, '2000-05': 3.6, '2000-11': 3.4, '2001-05': 3.0, '2001-11': 2.0, '2002-05': 2.0, '2002-11': 1.6, '2003-05': 1.1, '2003-11': 1.1, '2004-05': 1.0, '2004-11': 1.0, '2005-05': 1.2, '2005-11': 1.0, '2006-05': 1.4, '2006-11': 1.4, '2007-05': 1.3, '2007-11': 1.2, '2008-05': 0.0, '2008-11': 0.7, '2009-05': 0.1, '2009-11': 0.3, '2010-05': 0.2, '2010-11': 0.0, '2011-05': 0.0, '2011-11': 0.0, '2012-05': 0.0, '2012-11': 0.0, '2013-05': 0.0, '2013-11': 0.2, '2014-05': 0.1, '2014-11': 0.0, '2015-05': 0.0, '2015-11': 0.1, '2016-05': 0.1, '2016-11': 0.0, '2017-05': 0.0, '2017-11': 0.1, '2018-05': 0.3, '2018-11': 0.5, '2019-05': 0.5, '2019-11': 0.2, '2020-05': 0.0, '2020-11': 0.0, '2021-05': 0.0, '2021-11': 0.0, '2022-05': 0.0, '2022-11': 0.4, '2023-05': 0.9, '2023-11': 1.3, '2024-05': 1.3, '2024-11': 1.2, '2025-05': 1.1, '2025-11': 0.9, '2026-05': 0.9, '2026-11': 1.4,
};

export const ANNOUNCEMENTS = Object.keys(INFLATION).sort();
export const LATEST = ANNOUNCEMENTS[ANNOUNCEMENTS.length - 1];

// ---------------------------------------------------------------- months

export function parseMonth(s: string, what = 'month'): string {
  const m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(s.trim());
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new InputError(`"${s}" is not a ${what}. Use YYYY-MM, for example 2023-01.`);
  return `${m[1]}-${m[2].padStart(2, '0')}`;
}
const idx = (k: string) => Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1;
const key = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
export const addMonths = (k: string, n: number) => key(idx(k) + n);
export const monthsBetween = (a: string, b: string) => idx(b) - idx(a);
const NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (k: string) => `${NAMES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
export const currentMonth = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 7);

/** The announcement in force for a month: the latest of May 1 / November 1 (or September 1998) on or before it. */
export function announcementFor(k: string): string {
  let a: string | null = null;
  for (const x of ANNOUNCEMENTS) if (x <= k) a = x;
  if (!a) throw new InputError('Series I bonds were first issued in September 1998.');
  return a;
}

// ---------------------------------------------------------------- composite rate

/**
 * TreasuryDirect formula: fixed + 2 x semiannual inflation + fixed x semiannual inflation, rounded to 0.01 percent,
 * never below zero. Inputs and output in percent.
 */
export function compositeRate(fixed: number, semiannualInflation: number): number {
  const v = fixed + 2 * semiannualInflation + (fixed * semiannualInflation) / 100;
  const r = Math.round(v * 100 + 1e-7) / 100;
  return r < 0 ? 0 : r;
}

export function calculateCompositeRate(a: { fixed_rate: number; semiannual_inflation_rate: number }) {
  if (!(a.fixed_rate >= 0 && a.fixed_rate < 10)) throw new InputError('fixed_rate is a percent between 0 and 10, for example 1.4.');
  if (!(a.semiannual_inflation_rate > -10 && a.semiannual_inflation_rate < 10)) throw new InputError('semiannual_inflation_rate is a percent between -10 and 10, for example 2.04.');
  const raw = a.fixed_rate + 2 * a.semiannual_inflation_rate + (a.fixed_rate * a.semiannual_inflation_rate) / 100;
  const c = compositeRate(a.fixed_rate, a.semiannual_inflation_rate);
  return {
    summary: `A ${a.fixed_rate}% fixed rate with ${a.semiannual_inflation_rate}% semiannual inflation gives a composite rate of ${c}% a year${raw < 0 ? ' (the formula is negative, and Treasury never lets the composite go below zero)' : ''}.`,
    fixed_rate: a.fixed_rate,
    semiannual_inflation_rate: a.semiannual_inflation_rate,
    unrounded_percent: Math.round(raw * 1e6) / 1e6,
    composite_rate: c,
    formula: '[fixed rate + (2 x semiannual inflation rate) + (fixed rate x semiannual inflation rate)], rounded to the nearest 0.01 percent, floor 0',
    as_of: AS_OF,
    source: RATES_PAGE,
    more: more(),
  };
}

// ---------------------------------------------------------------- live page

export interface LiveRate { composite: number; fixed: number; inflation: number | null; from: string; to: string }
export function parseRatesPage(html: string): LiveRate | null {
  const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const m = /Current Interest Rate Series I Savings Bonds\s*([\d.]+)%\s*This includes a fixed rate of\s*([\d.]+)%\s*For I bonds issued (\w+) \d+, (\d{4}) to (\w+) \d+, (\d{4})/i.exec(t);
  if (!m) return null;
  const mi = (n: string) => NAMES.findIndex((x) => x.toLowerCase() === n.toLowerCase()) + 1;
  if (mi(m[3]) < 1 || mi(m[5]) < 1) return null;
  const inf = /Semiannual \(1\/2 year\) inflation rate\s*(-?[\d.]+)%/i.exec(t);
  return {
    composite: Number(m[1]), fixed: Number(m[2]), inflation: inf ? Number(inf[1]) : null,
    from: `${m[4]}-${String(mi(m[3])).padStart(2, '0')}`, to: `${m[6]}-${String(mi(m[5])).padStart(2, '0')}`,
  };
}

export async function getCurrentIBondRate(fetchText: FetchText | null, nowMs = Date.now()) {
  const cur = currentMonth(nowMs);
  let live: LiveRate | null = null;
  let live_check = 'skipped';
  if (fetchText) {
    try {
      live = parseRatesPage(await fetchText(RATES_PAGE, { cacheTtl: 21600, timeoutMs: 4000, accept: "text/html" }));
      live_check = live ? `TreasuryDirect page read: ${live.composite}% for bonds issued ${monthName(live.from)} to ${monthName(live.to)}` : 'TreasuryDirect page read, rate text not found; built-in table used';
    } catch (e) {
      live_check = `TreasuryDirect page not reachable (${(e as Error).message}); built-in table used`;
    }
  }
  const ann = cur >= ANNOUNCEMENTS[0] ? announcementFor(cur) : LATEST;
  const table = { fixed: FIXED[ann], inflation: INFLATION[ann], composite: compositeRate(FIXED[ann], INFLATION[ann]), from: ann, to: addMonths(ann, ann.endsWith('-09') ? 1 : 5) };
  const useLive = live && live.from >= table.from;
  const r = useLive ? { fixed: live!.fixed, inflation: live!.inflation ?? (live!.from === table.from ? table.inflation : null), composite: live!.composite, from: live!.from, to: live!.to } : table;
  const next = addMonths(r.to, 1);
  const mismatch = live && live.from === table.from && (live.composite !== table.composite || live.fixed !== table.fixed);
  return {
    summary:
      `I bonds bought from ${monthName(r.from)} through ${monthName(r.to)} earn ${r.composite}% a year for their first 6 months: a ${r.fixed.toFixed(2)}% fixed rate that lasts for the life of the bond plus ` +
      `${r.inflation ?? 'the'}${r.inflation !== null ? '%' : ''} semiannual inflation rate. Treasury sets the next rates on ${monthName(next).replace(' ', ' 1, ')}. ` +
      `Limit $10,000 in electronic I bonds per Social Security number per calendar year, $25 minimum, held at least 12 months, last 3 months of interest lost if cashed before 5 years.`,
    composite_rate: r.composite,
    fixed_rate: r.fixed,
    semiannual_inflation_rate: r.inflation,
    issue_period: { from: r.from, to: r.to },
    next_rate_announcement: `${next}-01`,
    rate_source: useLive ? 'live TreasuryDirect page' : 'built-in TreasuryDirect rate chart',
    live_check,
    table_mismatch: mismatch ? `The live page (${live!.composite}%, fixed ${live!.fixed}%) differs from the built-in chart (${table.composite}%, fixed ${table.fixed}%). The live page is reported.` : null,
    rules: { annual_limit_electronic: 10000, minimum_purchase: 25, earliest_redemption_months: 12, early_redemption_penalty: 'last 3 months of interest if cashed before 5 years', interest_life_years: 30 },
    as_of: new Date(nowMs).toISOString(),
    source: RATES_PAGE,
    more: more(),
  };
}

// ---------------------------------------------------------------- a bond's own rate schedule

export function bondSchedule(issue: string, through: string) {
  if (issue < ANNOUNCEMENTS[0]) throw new InputError('Series I bonds were first issued in September 1998.');
  const fixed = FIXED[announcementFor(issue)];
  const out: { period_start: string; period_end: string; announcement: string; semiannual_inflation_rate: number; composite_rate: number }[] = [];
  const end = addMonths(issue, 360);
  for (let p = issue; p <= through && p < end; p = addMonths(p, 6)) {
    if (p > addMonths(LATEST, LATEST.endsWith('-09') ? 1 : 5)) break; // rate not announced yet
    const a = announcementFor(p);
    out.push({ period_start: p, period_end: addMonths(p, 5), announcement: a, semiannual_inflation_rate: INFLATION[a], composite_rate: compositeRate(fixed, INFLATION[a]) });
  }
  return { fixed, periods: out };
}

export function getIBondRateForIssueDate(a: { issue_month: string; as_of_month?: string }, nowMs = Date.now()) {
  const issue = parseMonth(a.issue_month, 'issue month');
  const asOf = a.as_of_month ? parseMonth(a.as_of_month, 'as-of month') : currentMonth(nowMs);
  if (asOf < issue) throw new InputError(`as_of_month ${asOf} is before the issue month ${issue}.`);
  if (issue > addMonths(LATEST, LATEST.endsWith('-09') ? 1 : 5)) throw new InputError(`Rates for bonds issued in ${issue} are not announced yet. The latest rates cover ${monthName(LATEST)} to ${monthName(addMonths(LATEST, 5))}.`);
  const { fixed, periods } = bondSchedule(issue, asOf);
  const now = periods[periods.length - 1];
  const age = monthsBetween(issue, asOf);
  const matured = age >= 360;
  const upcoming = periods.length && now.period_end < asOf;
  return {
    summary: matured
      ? `An I bond issued in ${monthName(issue)} reached 30 years in ${monthName(addMonths(issue, 360))} and no longer earns interest.`
      : `An I bond issued in ${monthName(issue)} has a fixed rate of ${fixed.toFixed(2)}%. For ${monthName(now.period_start)} through ${monthName(now.period_end)} it earns ${now.composite_rate}% a year ` +
        `(semiannual inflation ${now.semiannual_inflation_rate}% from the ${monthName(now.announcement)} announcement). Its rate changes every ${monthName(issue).split(' ')[0]} and ${monthName(addMonths(issue, 6)).split(' ')[0]}.` +
        (upcoming ? ` The rate for the period starting ${monthName(addMonths(now.period_start, 6))} is not announced yet.` : ''),
    issue_month: issue,
    as_of_month: asOf,
    fixed_rate: fixed,
    current_period: matured ? null : now,
    rate_changes_in: [Number(issue.slice(5, 7)), ((Number(issue.slice(5, 7)) + 5) % 12) + 1].map((m) => NAMES[m - 1]),
    months_held: age,
    can_cash_now: age >= 12,
    penalty_if_cashed_now: age < 12 ? 'cannot cash before 12 months' : age < 60 ? 'loses the last 3 months of interest' : 'none',
    periods,
    as_of: AS_OF,
    source: RATE_CHART,
    more: more(),
  };
}

// ---------------------------------------------------------------- value estimate

const cents = (n: number) => Math.round(n * 100 + 1e-7) / 100;

/** Value of one $25 unit at the start of `month`, compounding semiannually and rounding to the cent. */
export function unitValue(issue: string, month: string): number {
  const { fixed, periods } = bondSchedule(issue, month);
  let v = 25;
  for (const p of periods) {
    const r = p.composite_rate / 100;
    const k = monthsBetween(p.period_start, month);
    if (k >= 6) { v = cents(v * (1 + r / 2)); continue; }
    return cents(v * Math.pow(1 + r / 2, k / 6));
  }
  void fixed;
  return v;
}

export function estimateIBondValue(a: { issue_month: string; amount: number; as_of_month?: string }, nowMs = Date.now()) {
  const issue = parseMonth(a.issue_month, 'issue month');
  const asOf = a.as_of_month ? parseMonth(a.as_of_month, 'as-of month') : currentMonth(nowMs);
  if (!(a.amount >= 25 && a.amount <= 1e7)) throw new InputError('amount is the purchase price in dollars, at least 25.');
  if (asOf < issue) throw new InputError(`as_of_month ${asOf} is before the issue month ${issue}.`);
  const held = Math.min(monthsBetween(issue, asOf), 360);
  const limit = addMonths(LATEST, LATEST.endsWith('-09') ? 2 : 6);
  const at = addMonths(issue, held);
  if (at > limit) throw new InputError(`The value for ${at} needs rates not announced yet. Use an as_of_month up to ${limit}.`);
  const units = a.amount / 25;
  const gross = cents(unitValue(issue, at) * units);
  const penaltyApplies = held < 60;
  const net = held < 12 ? null : penaltyApplies ? cents(unitValue(issue, addMonths(at, -3)) * units) : gross;
  const { fixed } = bondSchedule(issue, at);
  return {
    summary:
      `Estimate: ${a.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} of I bonds issued ${monthName(issue)} (fixed ${fixed.toFixed(2)}%) is worth about ` +
      `${gross.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} at the start of ${monthName(at)} after ${held} months. ` +
      (held < 12 ? 'It cannot be cashed before 12 months.' : penaltyApplies ? `Cashed now it pays about ${net!.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}, because the last 3 months of interest are lost before 5 years.` : 'No early-redemption penalty applies.'),
    issue_month: issue,
    as_of_month: at,
    amount: a.amount,
    months_held: held,
    value_with_all_interest: gross,
    redemption_value: net,
    interest_earned: cents(gross - a.amount),
    method: 'Per $25 of purchase price, interest compounds every 6 months at each period composite rate and the value is rounded to the cent; within a period the value grows monthly at the same rate. The 3-month penalty uses the value 3 months earlier. Treasury values can differ by a few cents; check the Savings Bond Calculator or your TreasuryDirect account.',
    as_of: AS_OF,
    source: RATE_CHART,
    more: more(),
  };
}

// ---------------------------------------------------------------- history

export function getIBondRateHistory(a: { limit?: number }) {
  const n = Math.min(Math.max(a.limit ?? 20, 1), ANNOUNCEMENTS.length);
  const rows = [...ANNOUNCEMENTS].reverse().slice(0, n).map((k) => ({
    announcement: k, fixed_rate_new_bonds: FIXED[k], semiannual_inflation_rate: INFLATION[k], composite_rate_new_bonds: compositeRate(FIXED[k], INFLATION[k]),
  }));
  const maxF = ANNOUNCEMENTS.reduce((b, k) => (FIXED[k] > FIXED[b] ? k : b), ANNOUNCEMENTS[0]);
  return {
    summary: `Latest I bond rates (${monthName(LATEST)}): fixed ${FIXED[LATEST].toFixed(2)}%, semiannual inflation ${INFLATION[LATEST]}%, composite ${compositeRate(FIXED[LATEST], INFLATION[LATEST])}% for new bonds. ` +
      `Showing ${n} of ${ANNOUNCEMENTS.length} announcements since September 1998. The highest fixed rate was ${FIXED[maxF].toFixed(2)}% (${monthName(maxF)}).`,
    count: n,
    rows,
    as_of: AS_OF,
    source: RATE_CHART,
    more: more(),
  };
}
