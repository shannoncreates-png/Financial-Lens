// Financial Lens — serverless data proxy (Vercel / Node 18+).
//
// Holds the API keys server-side so end users never need their own. The browser
// calls /api/proxy?provider=<fmp|av|sec|claude>&path=<encoded path> and this
// function injects the key and returns the upstream response (same-origin, so no
// CORS issues). Responses are edge-cached to conserve free-tier request quota.
//
// Configure in Vercel → Project → Settings → Environment Variables:
//   FMP_API_KEY        (required)  — financialmodelingprep.com free key
//   ALPHAVANTAGE_API_KEY (optional) — adds richer market data / price history
//   ANTHROPIC_API_KEY  (optional)  — enables AI query parsing + synthesis for all users (you pay for tokens)

const PROVIDERS = {
  fmp:    { base: 'https://financialmodelingprep.com/', env: 'FMP_API_KEY',          keyParam: 'apikey' },
  av:     { base: 'https://www.alphavantage.co/',       env: 'ALPHAVANTAGE_API_KEY', keyParam: 'apikey' },
  sec:    { base: 'https://data.sec.gov/',              ua: true },
  claude: { base: 'https://api.anthropic.com/',         env: 'ANTHROPIC_API_KEY',    post: true },
};

function providerConfigured(p) {
  const c = PROVIDERS[p];
  return !!(c && (c.ua || process.env[c.env]));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Capability ping — the client uses this to decide whether keys are needed.
  if (req.query.ping) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, providers: Object.keys(PROVIDERS).filter(providerConfigured) });
    return;
  }

  const provider = String(req.query.provider || '');
  const conf = PROVIDERS[provider];
  if (!conf) { res.status(400).json({ error: 'unknown provider' }); return; }
  if (conf.env && !process.env[conf.env]) { res.status(503).json({ error: provider + ' not configured on this deployment' }); return; }

  const rawPath = String(req.query.path || '').replace(/^\/+/, '');
  let target = conf.base + rawPath;

  // ---- Claude: POST passthrough ----
  if (provider === 'claude') {
    if (req.method !== 'POST') { res.status(405).json({ error: 'claude requires POST' }); return; }
    try {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body,
      });
      const text = await r.text();
      res.setHeader('Content-Type', 'application/json');
      res.status(r.status).send(text);
    } catch (e) {
      res.status(502).json({ error: 'claude proxy failed', detail: String(e && e.message || e) });
    }
    return;
  }

  // ---- GET providers (fmp / av / sec) ----
  if (conf.keyParam) {
    target += (target.includes('?') ? '&' : '?') + conf.keyParam + '=' + encodeURIComponent(process.env[conf.env]);
  }
  try {
    const headers = {};
    // SEC requires a declared User-Agent; this also bypasses the browser CORS block on /api/xbrl.
    if (conf.ua) headers['User-Agent'] = 'Financial Lens (open-source financial dashboard)';
    const r = await fetch(target, { headers });
    const text = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    // Cache at the edge: statements/profile change slowly; this conserves free-tier quota.
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: 'proxy fetch failed', detail: String(e && e.message || e) });
  }
}
