# Data sources

All sources below were fetched on 2026-11-05 while building version 1.0.0. The current rate is also read from the TreasuryDirect rates page at call time; the full rate table is written into the code.

| Data | URL | Notes |
|---|---|---|
| Current rate and formula | https://www.treasurydirect.gov/savings-bonds/i-bonds/i-bonds-interest-rates/ | 5.51% for I bonds issued November 1, 2026 to April 30, 2027, fixed 1.40%, semiannual inflation 2.04%. Worked example 0.0140 + 0.0408 + 0.0002856 = 0.0550856. Rate change months by issue month. Read at call time, cached 6 hours. From the Cloudflare Worker the page did not answer within 12 s on 2026-11-05, so the hosted server uses the built-in chart. |
| All fixed, inflation and composite rates | https://www.treasurydirect.gov/files/savings-bonds/i-bond-rate-chart.pdf | "Series I Savings Bond Interest Rates Effective November 1, 2026". 58 issue periods from September 1998, 58 semiannual inflation rates and 1,711 composite cells. The formula reproduces every cell (test fixture). |
| Rate history spreadsheet | https://www.treasurydirect.gov/files/savings-bonds/series-i-ussb-interest-rate-history.xlsx | Linked from the rates page. Not used in code. |
| Purchase and redemption rules | https://www.treasurydirect.gov/savings-bonds/i-bonds/ and https://www.treasurydirect.gov/savings-bonds/how-much-can-i-spend-own/ | $25 minimum, $10,000 electronic I bonds per SSN or EIN per calendar year, cash after 12 months, last 3 months of interest lost before 5 years, interest for 30 years. |

Test fixtures in `test/fixtures/` are the TreasuryDirect rates page saved on 2026-11-05 and the rate chart cells extracted from the PDF with `pdftotext -layout`.
