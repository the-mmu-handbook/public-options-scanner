/**
 * Public Options Scanner — Express Proxy Server
 *
 * Runs on localhost:3000 and proxies requests to api.public.com
 * to avoid CORS issues in the browser. Your API token is sent
 * per-request via the x-public-token header and never stored server-side.
 *
 * Prerequisites:
 *   node >= 18 (uses built-in fetch)
 *   npm install
 *   node server.js
 */

const express = require('express');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const BASE = 'https://api.public.com/userapigateway';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Utility: forward a request to the Public API ──────────────────────────
async function pub(method, url, body, token) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 502, data: { error: err.message } };
  }
}

const tok = req => req.headers['x-public-token'];

// ── Routes ────────────────────────────────────────────────────────────────

// POST /api/auth → exchange secret key for a short-lived access token
// Body: { secret: "...", validityInMinutes: 60 }
app.post('/api/auth', async (req, res) => {
  const { secret, validityInMinutes = 60 } = req.body;
  if (!secret) return res.status(400).json({ error: 'secret is required' });

  try {
    const r = await fetch(
      'https://api.public.com/userapiauthservice/personal/access-tokens',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, validityInMinutes }),
      }
    );
    const data = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/accounts → list accounts
app.get('/api/accounts', async (req, res) => {
  const r = await pub('GET', `${BASE}/trading/account`, null, tok(req));
  res.status(r.status).json(r.data);
});

// POST /api/quotes → real-time bid/ask for equities
app.post('/api/quotes', async (req, res) => {
  const { accountId, ...body } = req.body;
  const r = await pub('POST', `${BASE}/marketdata/${accountId}/quotes`, body, tok(req));
  res.status(r.status).json(r.data);
});

// POST /api/expirations → available expiry dates for a ticker
app.post('/api/expirations', async (req, res) => {
  const { accountId, ...body } = req.body;
  const r = await pub('POST', `${BASE}/marketdata/${accountId}/option-expirations`, body, tok(req));
  res.status(r.status).json(r.data);
});

// POST /api/chain → full option chain (calls + puts) for a date
app.post('/api/chain', async (req, res) => {
  const { accountId, ...body } = req.body;
  const r = await pub('POST', `${BASE}/marketdata/${accountId}/option-chain`, body, tok(req));
  res.status(r.status).json(r.data);
});

// GET /api/greeks?accountId=...&osiSymbols=...&osiSymbols=...
// Fetches delta, gamma, theta, vega, rho, IV for up to 250 contracts
app.get('/api/greeks', async (req, res) => {
  const { accountId } = req.query;
  const raw = req.query.osiSymbols;
  const symbols = Array.isArray(raw) ? raw : (raw ? [raw] : []);

  if (!symbols.length) return res.status(400).json({ error: 'osiSymbols required' });

  // Build query string with repeated params (URLSearchParams handles encoding)
  const params = new URLSearchParams();
  symbols.forEach(s => params.append('osiSymbols', s));

  const r = await pub('GET', `${BASE}/option-details/${accountId}/greeks?${params}`, null, tok(req));
  res.status(r.status).json(r.data);
});

// POST /api/preflight → cost estimate + validation before placing a multi-leg order
app.post('/api/preflight', async (req, res) => {
  const { accountId, ...body } = req.body;
  const r = await pub('POST', `${BASE}/trading/${accountId}/preflight/multi-leg`, body, tok(req));
  res.status(r.status).json(r.data);
});

// POST /api/place-order → submit a live multi-leg order (CAUTION: real money)
app.post('/api/place-order', async (req, res) => {
  const { accountId, ...body } = req.body;
  if (!body.orderId) body.orderId = uuidv4(); // generate idempotency key
  const r = await pub('POST', `${BASE}/trading/${accountId}/order/multileg`, body, tok(req));
  res.status(r.status).json(r.data);
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n ╔═══════════════════════════════════════════╗');
  console.log(` ║   PUBLIC OPTIONS SCANNER                  ║`);
  console.log(` ║   http://localhost:${PORT}                   ║`);
  console.log(' ╚═══════════════════════════════════════════╝\n');
  console.log('  ⚠  Live trading enabled — use with caution\n');
});
