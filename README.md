# Financial Lens

Search any public company (or compare two) and get a structured, sourced, **data-only**
synthesis of its financial state — pulled live from public financial data sources.
No recommendations, no buy/sell signals, no AI speculation. Every number traces to a source.

Single-file app: open `index.html` in a browser. No build step, no backend.
React + Tailwind + Recharts + Babel are loaded from CDNs.

## Running it

Just open the file:

```
# directly
start index.html        # Windows

# or serve it (any static server works)
python -m http.server 4178
# then visit http://localhost:4178
```

## API keys (entered in the ⚙ Settings panel, saved to localStorage)

| Key | What it unlocks | Get one |
|-----|-----------------|---------|
| **Anthropic** | AI query parsing + financial synthesis (`claude-sonnet-4-6`) | https://console.anthropic.com |
| **Alpha Vantage** | Quote, 5-year price history, market-data overview | https://www.alphavantage.co/support/#api-key |
| **Financial Modeling Prep** | Income/balance/cash-flow statements, ratios, estimates, segmentation | https://financialmodelingprep.com/developer/docs |

Without an Anthropic key the app falls back to a built-in deterministic data mapping
(no AI). At least one of **FMP or Alpha Vantage** is required to resolve the company and
fetch financials (see the CORS note below).

## Data sources & the browser CORS reality

This is a 100% client-side app, so every data source must allow cross-origin requests.
Tested behavior from the browser:

- ✅ `data.sec.gov/submissions/CIK*.json` — **CORS-enabled.** Used for company metadata,
  recent filings, IR links, fiscal year.
- ❌ `data.sec.gov/api/xbrl/companyfacts/...` — **CORS-blocked in-browser.** Standardized
  XBRL facts cannot be fetched client-side, so financial line items are sourced from FMP
  instead.
- ❌ `www.sec.gov/files/company_tickers.json` and `efts.sec.gov/...` — **CORS-blocked.**
  So the **CIK is resolved from FMP `profile` or Alpha Vantage `OVERVIEW`** (both carry a
  `cik`/`CIK` field and are CORS-friendly), not from the SEC ticker map.
- ✅ Alpha Vantage, Financial Modeling Prep — CORS-friendly.
- ✅ Anthropic Messages API — called with `anthropic-dangerous-direct-browser-access: true`.

Consequence: a name → ticker → CIK lookup needs an FMP or Alpha Vantage key. Once the CIK
is known, the SEC submissions endpoint fills in filings and IR data.

## Search modes

- **Single:** `Apple`, `AAPL`, `Nvidia`, `Tesla`
- **Comparison:** `Apple vs Microsoft`, `AAPL vs MSFT`, `Nvidia versus AMD`

Mode is auto-detected (via Claude when an Anthropic key is present, otherwise a local
parser). Ambiguous two-company queries prompt a Yes/No confirmation.

## Guardrails

No investment advice or price targets. The Alpha Vantage analyst-target-price field is
stripped. Calculated metrics show their formula and input values. Forward estimates and
earnings-call content carry prominent disclaimers. The full disclaimer is always the last,
fully-visible element on the page.
