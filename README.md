# i-bond-rate-mcp

Current I bond rate for AI assistants, and the rate your own I bond earns now. I bonds bought from November 1, 2026 to April 30, 2027 earn 5.51 percent, with a 1.40 percent fixed rate.

This is a Model Context Protocol (MCP) server. It reads the current rate from TreasuryDirect at call time and carries every rate since September 1998 from the TreasuryDirect rate chart. It needs no API key.

## Tools

| Tool | What it returns |
| --- | --- |
| `get_current_i_bond_rate` | Composite, fixed and semiannual inflation rate for I bonds bought now, the issue window, the next announcement date and the purchase and redemption rules. |
| `get_i_bond_rate_for_issue_date` | For a bond bought in a given month: its fixed rate, the rate it earns in the current 6-month period, the two months its rate changes, whether it can be cashed and every rate period since issue. |
| `estimate_i_bond_value` | Estimated value for an issue month and amount, with all interest and after the 3-month penalty for bonds under 5 years. |
| `calculate_i_bond_composite_rate` | The Treasury formula for any fixed rate and semiannual inflation rate, for predictions. |
| `get_i_bond_rate_history` | Every fixed rate and semiannual inflation rate since September 1998, newest first. |

Every result has structured JSON, a one-paragraph summary, `as_of`, `source` (the TreasuryDirect page or rate chart) and `more` (a page on [mcpstamp.com](https://www.mcpstamp.com/servers/?utm_source=mcp&utm_medium=i-bond-rate-mcp)).

## What it knows that your model does not

- The November 2026 rates (5.51 percent composite, 1.40 percent fixed, 2.04 percent semiannual inflation). Treasury announced them on November 1, 2026.
- That an existing bond does not earn the new-bond rate. It keeps its own fixed rate and gets a new inflation rate every 6 months from its issue month, so a bond bought in April 2022 earns 3.34 percent from October 2026 while a bond bought in January 2023 earns 3.75 percent until January 2027.
- The exact rounding and the zero floor. The formula reproduces all 1,711 composite rates in the Treasury chart.

## Install

### Hosted (Claude.ai custom connector, ChatGPT developer mode)

Paste this URL. No token, no sign-up. It works now.

```
https://i-bond-rate-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http i-bond https://i-bond-rate-mcp.lipmichal.workers.dev/mcp
```

### Claude Desktop

Claude Desktop adds remote servers under Settings, Connectors, Add custom connector. Paste the URL above.

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "i-bond": { "url": "https://i-bond-rate-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "i-bond": { "type": "http", "url": "https://i-bond-rate-mcp.lipmichal.workers.dev/mcp" }
  }
}
```

### Local stdio (after npm release)

The npm package is not published yet. After it is, run it locally with Node 20 or newer:

```
claude mcp add i-bond -- npx -y i-bond-rate-mcp
```

## Example prompts

- "What is the I bond rate right now?"
- "What is the I bond fixed rate for November 2026?"
- "I bought I bonds in April 2022. What rate are they earning now?"
- "What is $10,000 of I bonds bought in January 2023 worth today, and what would I get if I cash them?"
- "If May 2027 inflation is 1.5 percent and the fixed rate stays at 1.40, what would the I bond rate be?"

## Data sources

Full list with fetch dates in [DATA_SOURCES.md](DATA_SOURCES.md).

- [TreasuryDirect I bonds interest rates](https://www.treasurydirect.gov/savings-bonds/i-bonds/i-bonds-interest-rates/), read at call time.
- [TreasuryDirect Series I rate chart](https://www.treasurydirect.gov/files/savings-bonds/i-bond-rate-chart.pdf), effective November 1, 2026.

## Limitations

- Value is an estimate per $25 with semiannual compounding. Treasury values can differ by cents. Your TreasuryDirect account and the Savings Bond Calculator are the record.
- Rates after April 2027 are not known until Treasury announces them on May 1, 2027. The current-rate tool reads the live page, but the per-bond schedule uses the built-in chart until this server is updated.
- TreasuryDirect did not answer the hosted Worker on 2026-11-05, so the hosted server falls back to the built-in rate chart after a few seconds. Every result says which source it used in `rate_source`.
- It does not read your TreasuryDirect account and does not handle EE bonds or taxes.

## More

More MCP servers that answer questions your assistant cannot answer alone are on [mcpstamp.com](https://www.mcpstamp.com/servers/?utm_source=mcp&utm_medium=i-bond-rate-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

Built by [theluckystrike](https://github.com/theluckystrike).

## Development

```
npm install
npm test                              # builds, then runs the fixture tests and an offline stdio test
node scripts/stdio-transcript.mjs     # live stdio round trip, writes .live/stdio-transcript.jsonl
```

## License

MIT
