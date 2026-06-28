# Financial Lens

Search any public company (or compare two) and get a structured, sourced, **data-only**
synthesis of its financial state — pulled live from public financial data sources.
No recommendations, no buy/sell signals, no AI speculation. Every number traces to a source.

The frontend is a single `index.html` (React + Tailwind + Recharts + Babel from CDNs, no
build step). A tiny optional serverless proxy (`api/proxy.js`) holds the API keys so that
**end users need no keys of their own.**

## Recommended: deploy to Vercel (users need zero keys)

The bundled `api/proxy.js` keeps your API key server-side. Deploy the repo to Vercel and
everyone who visits gets full live data with no setup.

1. Get a free **Financial Modeling Prep** key → https://site.financialmodelingprep.com/ (the
   free tier covers profile, quote, statements, ratios, and price history).
2. Import this repo at https://vercel.com/new (no build settings needed — it's static + one function).
3. In **Project → Settings → Environment Variables**, add:
   - `FMP_API_KEY` — **required**
   - `ALPHAVANTAGE_API_KEY` — *optional*, adds adjusted price history / extra market data
   - `ANTHROPIC_API_KEY` — *optional*, turns on AI query parsing + the richer narrative
     synthesis for every visitor (you pay for those tokens; without it the app uses a free,
     deterministic data mapping that still fills the whole dashboard)
4. Deploy. The frontend auto-detects the proxy (`/api/proxy`) and shows
   "● Data backend connected — no API key needed."

Responses are edge-cached (`s-maxage`), so popular tickers don't repeatedly spend your
free-tier quota. (Cloudflare Pages + Functions works the same way if you prefer it.)

## Running locally without the proxy

You can also open it as a pure static file and paste your own keys in the ⚙ Settings panel
(saved to `localStorage`):

```
python -m http.server 4178   # then visit http://localhost:4178
```

| Key | What it unlocks | Get one |
|-----|-----------------|---------|
| **Financial Modeling Prep** | Company resolution, price, statements, ratios, estimates — most of the dashboard | https://financialmodelingprep.com/developer/docs |
| **Alpha Vantage** | Adjusted price history + extra market-data fields | https://www.alphavantage.co/support/#api-key |
| **Anthropic** | AI query parsing + narrative synthesis (`claude-sonnet-4-6`) | https://console.anthropic.com |

Locally, at least an **FMP** (or Alpha Vantage) key is required to resolve a company and
fetch financials. Anthropic is always optional.

## Data sources & the browser CORS reality

The proxy exists because a 100% client-side app can only use sources that allow
cross-origin browser requests — and the best free ones don't. Tested behavior:

- ✅ `data.sec.gov/submissions/CIK*.json` — **CORS-enabled.** Used for company metadata,
  recent filings, IR links, fiscal year.
- ❌ `data.sec.gov/api/xbrl/companyfacts/...` — **CORS-blocked in-browser.** Standardized
  XBRL facts cannot be fetched client-side, so financial line items are sourced from FMP
  instead.
- ❌ `www.sec.gov/files/company_tickers.json` and `efts.sec.gov/...` — **CORS-blocked.**
  So the **CIK is resolved from FMP `profile` or Alpha Vantage `OVERVIEW`** (both carry a
  `cik`/`CIK` field and are CORS-friendly), not from the SEC ticker map.
- ✅ Alpha Vantage, Financial Modeling Prep — CORS-friendly (still need keys).
- ✅ Anthropic Messages API — works from the browser with `anthropic-dangerous-direct-browser-access: true`.

Consequence: there is no way to pull comprehensive live financial data into a purely
client-side page without *someone's* key. The serverless proxy solves this by holding the
key server-side; the client calls it same-origin (`/api/proxy`), so there are no CORS issues
and users need nothing. The proxy also fronts `data.sec.gov` with a proper `User-Agent`,
which additionally unblocks the SEC XBRL endpoints that the browser can't reach directly.

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
