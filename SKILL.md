# Public Options Scanner — SKILL.md

## Overview

A full-featured, real-time options trading terminal built entirely on the Public API. Connects to your Public brokerage account and provides a professional-grade scanning, analysis, and order execution environment — all running locally in your browser via a lightweight Node.js proxy.

---

## Configuration

### Environment

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `3000`) |

### Authentication

The app uses Public's two-step auth flow:

1. Generate a **Secret Key** at [public.com/settings/security/api](https://public.com/settings/security/api)
2. Paste it into the app's API TOKEN field — the app exchanges it for a short-lived access token automatically
3. Token validity is set to 120 minutes; the app warns you before expiry

**Security:** The secret key is stored in `localStorage` only. Access tokens are never persisted — they're exchanged fresh on each connect. The Express proxy forwards tokens per-request and never logs or stores them.

---

## Setup

### Prerequisites
- Node.js 18+ (uses built-in `fetch`)
- A Public.com brokerage account
- A Public API secret key from [public.com/settings/security/api](https://public.com/settings/security/api)

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/public-options-scanner
cd public-options-scanner
npm install
npm start
# Open http://localhost:3000
```

---

## Capabilities

This skill chains **7 Public API endpoints** across 4 integrated tabs:

### 📊 Scanner Tab
- Real-time option chain (calls + puts) with bid/ask, volume, open interest
- **Streaming Greeks** — chain renders immediately, IV/Δ/Θ stream in ATM-first
- Greeks batched at 20 symbols per request to respect URL limits
- Filters: Calls/Puts/Both · Min IV% · ±Strikes around ATM · ⚡ Unusual activity
- Unusual = volume > 50% of OI AND volume > 500 contracts
- Auto-refresh at 15s / 30s / 60s / 2min polling intervals
- Light / Auto / Dark theme

### ⚡ Strategy Builder Tab
**20 strategies** auto-populate legs from the live chain:

| Category | Strategies |
|---|---|
| Bullish | Bull Call Spread, Bull Put Spread, Cash-Secured Put, Covered Call, Synthetic Long |
| Bearish | Bear Put Spread, Bear Call Spread, Protective Put, Synthetic Short |
| Neutral | Iron Condor, Iron Butterfly, Butterfly, Broken Wing Butterfly, Calendar, Diagonal |
| Volatile | Straddle, Strangle, Jade Lizard, Ratio Spread, Condor |

Per-leg controls:
- **Strike dropdown** — all available strikes from the loaded chain
- **Expiry dropdown** — all loaded expirations; changing expiry re-fetches that chain and finds the matching contract automatically
- **Side** (BUY/SELL) and **Ratio** overridable per leg

Pre-trade flow:
1. Run **Preflight** → estimated cost, buying power requirement, ORF/OCC/commission fees
2. Review **Payoff Diagram** (expiry curve + Black-Scholes theoretical, HiDPI canvas)
3. **Date slider** — animate theoretical P&L from today → expiry
4. **Place Order** → live multi-leg order with confirmation modal

### γ GEX Tab
- Gamma Exposure per strike: Call GEX (green bars), Put GEX (red bars), Net GEX (amber line)
- All expirations grouped by week/month — click any pill to switch
- **Key levels**: Gamma Wall (highest absolute GEX), Zero Gamma crossing
- Auto-loads on tab switch, auto-resets on ticker change
- Progressive spinner during computation

### 📈 Analytics Tab
Five sub-views, all zero additional API calls (data reused from chain + Greeks cache):

| Sub-tab | What it shows |
|---|---|
| **IV Smile** | Call/Put IV vs strike for current expiry, ATM IV, skew measurement |
| **Max Pain** | Dollar pain at each strike, max pain level vs spot |
| **Put/Call Ratio** | OI bar chart by strike + P/C ratio line, aggregate sentiment |
| **Implied Move** | ATM straddle → ±% expected move, price range visualisation |
| **Vol Surface** | Pseudo-3D IV surface across all expirations, heat-coloured mesh, term structure |

---

## API Endpoints Used

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/userapiauthservice/personal/access-tokens` | Exchange secret → access token |
| `GET`  | `/userapigateway/trading/account` | List accounts |
| `POST` | `/userapigateway/marketdata/{id}/quotes` | Underlying spot price |
| `POST` | `/userapigateway/marketdata/{id}/option-expirations` | Available expiry dates |
| `POST` | `/userapigateway/marketdata/{id}/option-chain` | Full call/put chain |
| `GET`  | `/userapigateway/option-details/{id}/greeks` | IV, Δ, Γ, Θ, V, ρ |
| `POST` | `/userapigateway/trading/{id}/preflight/multi-leg` | Pre-trade cost estimate |
| `POST` | `/userapigateway/trading/{id}/order/multileg` | Live multi-leg order placement |

---

## Architecture

```
Browser → http://localhost:3000
              │
              ▼  /api/* routes
         Express proxy (server.js)
              │
              ▼  Bearer token per-request
         api.public.com
```

The Express layer exists solely to avoid CORS. No data is stored server-side.

---

## Safety & Guardrails

- **Confirmation modal** before every live order — shows strategy name, cost, buying power requirement
- **Preflight required** before Place Order button enables
- **No auto-trading** — every order requires explicit user confirmation
- **Secret key never transmitted to Public** directly from browser — always via local proxy
- **Rate limiting respected** — Greeks fetched in sequential batches of 20, not parallel bursts
- **Paper trading note** displayed in UI — "⚠ Live trading enabled — use with caution"

---

## Complexity Chains

This skill demonstrates chaining multiple Public capabilities in a single workflow:

```
Auth → Account → Quote → Expirations → Chain → Greeks
         ↓
    Strategy Builder
         ↓
    Preflight → Place Order
         ↓
    GEX Analysis (cross-expiry)
         ↓
    Vol Surface (all expirations)
```

Every tab reuses cached data from prior fetches to minimise API calls.
