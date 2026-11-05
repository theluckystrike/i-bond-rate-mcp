// Tool registry shared by the stdio and Worker entries.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  InputError, REPO, SITE, calculateCompositeRate, estimateIBondValue, getCurrentIBondRate, getIBondRateForIssueDate, getIBondRateHistory,
} from './core.js';
import type { FetchText } from './types.js';

export const VERSION = '1.0.0';

export const TOOL_INFO = [
  { name: 'get_current_i_bond_rate', blurb: 'The I bond rate for bonds bought now (November 2026 to April 2027: 5.51 percent, fixed 1.40 percent), read from TreasuryDirect, with the next announcement date and purchase rules.' },
  { name: 'get_i_bond_rate_for_issue_date', blurb: 'The fixed rate and the rate an existing I bond earns now, by issue month, with every 6-month rate period since it was bought.' },
  { name: 'estimate_i_bond_value', blurb: 'Estimated value of I bonds by issue month and amount, before and after the 3-month early-redemption penalty.' },
  { name: 'calculate_i_bond_composite_rate', blurb: 'Treasury composite rate formula for any fixed rate and semiannual inflation rate.' },
  { name: 'get_i_bond_rate_history', blurb: 'Every fixed rate and semiannual inflation rate since September 1998, from the TreasuryDirect rate chart.' },
];

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

function ok(data: Record<string, unknown> & { summary: string }) {
  return { content: [{ type: 'text' as const, text: `${data.summary}\n\n${JSON.stringify(data, null, 2)}` }], structuredContent: data };
}
function fail(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return { isError: true, content: [{ type: 'text' as const, text: `${e instanceof InputError ? 'Error' : 'Upstream TreasuryDirect error'}: ${msg}` }] };
}
const wrap = <A>(f: (a: A) => unknown) => async (a: A) => { try { return ok((await f(a)) as any); } catch (e) { return fail(e); } };

const issueMonth = z.string().regex(/^\d{4}-\d{1,2}(-\d{1,2})?$/).describe('Issue month of the bond as YYYY-MM, for example "2023-01". The issue date is the first of the month you bought it.');
const asOfMonth = z.string().regex(/^\d{4}-\d{1,2}(-\d{1,2})?$/).optional().describe('Month to evaluate, YYYY-MM. Default: the current month.');

export function createServer(fetchText: FetchText): McpServer {
  const server = new McpServer({ name: REPO, version: VERSION, websiteUrl: SITE } as any, {
    instructions:
      'Series I savings bond rates from TreasuryDirect. The rate for I bonds bought November 1, 2026 to April 30, 2027 is 5.51 percent (fixed 1.40 percent, semiannual inflation 2.04 percent), announced after most model training data. ' +
      'Every older bond has its own fixed rate and changes rate every 6 months from its issue month; use get_i_bond_rate_for_issue_date for "what is my I bond earning now".',
  });

  server.registerTool('get_current_i_bond_rate', {
    title: 'Get current I bond rate',
    description:
      'Current Series I savings bond composite rate, fixed rate and semiannual inflation rate for new purchases, read at call time from the TreasuryDirect "I bonds interest rates" page with the built-in rate chart as fallback. ' +
      'November 2026 to April 2027: 5.51 percent with a 1.40 percent fixed rate. Also returns the next announcement date and the $10,000 limit, 12-month hold and 3-month penalty rules.',
    inputSchema: {},
    annotations: { title: 'Current I bond rate', ...RO, openWorldHint: true },
  }, wrap(() => getCurrentIBondRate(fetchText)));

  server.registerTool('get_i_bond_rate_for_issue_date', {
    title: 'Get I bond rate for an issue date',
    description:
      'For an I bond bought in a given month: its fixed rate, the composite rate it earns in the current (or given) 6-month period, the months its rate changes, whether it can be cashed and the penalty, and every rate period since issue. ' +
      'Computed from the TreasuryDirect rate chart effective November 1, 2026.',
    inputSchema: { issue_month: issueMonth, as_of_month: asOfMonth },
    annotations: { title: 'I bond rate by issue date', ...RO },
  }, wrap((a: any) => getIBondRateForIssueDate(a)));

  server.registerTool('estimate_i_bond_value', {
    title: 'Estimate I bond value',
    description:
      'Estimate what I bonds are worth for an issue month and purchase amount at the start of a month: value with all interest and the redemption value after the 3-month penalty for bonds under 5 years. ' +
      'Uses semiannual compounding per $25 with the TreasuryDirect rates. An estimate; Treasury values can differ by cents.',
    inputSchema: {
      issue_month: issueMonth,
      amount: z.number().min(25).max(10000000).describe('Purchase price in dollars, for example 10000.'),
      as_of_month: asOfMonth,
    },
    annotations: { title: 'I bond value estimate', ...RO },
  }, wrap((a: any) => estimateIBondValue(a)));

  server.registerTool('calculate_i_bond_composite_rate', {
    title: 'Calculate I bond composite rate',
    description: 'Apply the Treasury formula fixed + 2 x semiannual inflation + fixed x semiannual inflation, rounded to 0.01 percent with a floor of zero. Use it for rate predictions.',
    inputSchema: {
      fixed_rate: z.number().min(0).max(10).describe('Fixed rate in percent, for example 1.4.'),
      semiannual_inflation_rate: z.number().min(-10).max(10).describe('Semiannual inflation rate in percent, for example 2.04.'),
    },
    annotations: { title: 'Composite rate formula', ...RO },
  }, wrap((a: any) => calculateCompositeRate(a)));

  server.registerTool('get_i_bond_rate_history', {
    title: 'Get I bond rate history',
    description: 'Fixed rate for new bonds, semiannual inflation rate and composite rate for every May and November announcement since September 1998, newest first, from the TreasuryDirect rate chart.',
    inputSchema: { limit: z.number().int().min(1).max(60).optional().describe('How many announcements, newest first. Default 20.') },
    annotations: { title: 'I bond rate history', ...RO },
  }, wrap((a: any) => getIBondRateHistory(a)));

  return server;
}
