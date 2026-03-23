# ⬡ Public Options Scanner

> A real-time options trading terminal built on the [Public.com](https://public.com) brokerage API.
> > Scan chains · Build strategies · Analyse GEX · Visualise the vol surface · Place live orders.
> >
> > ![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-%3E%3D18-green) ![Public API](https://img.shields.io/badge/Public-API-orange)
> >
> > ---
> >
> > ## Demo
> >
> > ▶ [Watch the Demo](https://github.com/the-mmu-handbook/public-options-scanner/blob/main/Option%20Scanner%20Demo.mp4)
> >
> > https://github.com/the-mmu-handbook/public-options-scanner/blob/main/Option%20Scanner%20Demo.mp4
> >
> > ---
> >
> > ## What It Does
> >
> > A single-file web app + lightweight Node.js proxy that turns your Public brokerage account into a professional options terminal. Four tabs, zero external charting libraries, zero additional data subscriptions — everything powered by the Public API.
> >
> > | Tab | Description |
> > |---|---|
> > | 📊 **Scanner** | Real-time option chain with streaming Greeks, unusual activity detection, strike filters |
> > | ⚡ **Strategy Builder** | 20 strategies auto-populate from the live chain, per-leg strike/expiry overrides, payoff diagram, live order placement |
> > | γ **GEX** | Gamma Exposure chart across all expirations, gamma wall + zero gamma levels |
> > | 📈 **Analytics** | IV Smile, Max Pain, Put/Call Ratio, Implied Move, 3D Volatility Surface |
> >
> > ---
> >
> > ## Quick Start
> >
> > ### Prerequisites
> > - Node.js 18+
> > - - A [Public.com](https://public.com) brokerage account
> >   - - A Public API secret key — generate one at [public.com/settings/security/api](https://public.com/settings/security/api)
> >    
> >     - ### Install
> >    
> >     - ```bash
> >       git clone https://github.com/the-mmu-handbook/public-options-scanner
> >       cd public-options-scanner
> >       npm install
> >       npm start
> >       ```
> >
> > Open **http://localhost:3000**, paste your secret key, and click **CONNECT**.
> >
> > ---
> >
> > ## Architecture
> >
> > ```
> > Browser  ──────────────►  Express proxy (server.js:3000)
> >                                │
> >                                │  Bearer token per-request
> >                                ▼
> >                          api.public.com
> > ```
> >
> > The Express server is a thin CORS proxy. Your secret key is exchanged for a short-lived access token on connect. No credentials are stored server-side.
> >
> > ---
> >
> > ## API Endpoints Used
> >
> > | Method | Endpoint | Purpose |
> > |---|---|---|
> > | `POST` | `/userapiauthservice/personal/access-tokens` | Secret → access token |
> > | `GET`  | `/trading/account` | List accounts |
> > | `POST` | `/marketdata/{id}/quotes` | Live underlying price |
> > | `POST` | `/marketdata/{id}/option-expirations` | Available expiry dates |
> > | `POST` | `/marketdata/{id}/option-chain` | Full call/put chain |
> > | `GET`  | `/option-details/{id}/greeks` | IV, Δ, Γ, Θ, V, ρ |
> > | `POST` | `/trading/{id}/preflight/multi-leg` | Pre-trade cost estimate |
> > | `POST` | `/trading/{id}/order/multileg` | Live multi-leg order |
> >
> > ---
> >
> > ## Features in Detail
> >
> > ### 📊 Scanner
> > - Real-time bid/ask, volume, open interest per strike
> > - - Greeks stream in progressively — ATM-closest contracts load first
> >   - - **⚡ Unusual activity** — flags contracts where volume > 50% of OI and > 500 contracts
> >     - - **Strikes filter** — ±5 / ±10 / ±20 / ±40 / All around spot
> >       - - **Min IV filter** — hide low-vol strikes
> >         - - Auto-refresh at 15s / 30s / 60s / 2min
> >          
> >           - ### ⚡ Strategy Builder
> >           - **20 strategies** auto-populate from the live chain:
> >          
> >           - **Bullish** — Bull Call Spread, Bull Put Spread, Cash-Secured Put, Covered Call, Synthetic Long
> >           - **Bearish** — Bear Put Spread, Bear Call Spread, Protective Put, Synthetic Short
> >           - **Neutral** — Iron Condor, Iron Butterfly, Butterfly, Broken Wing Butterfly, Calendar, Diagonal
> > **Volatile** — Straddle, Strangle, Jade Lizard, Ratio Spread, Condor
> >
> > Each leg has a **strike dropdown** and **expiry dropdown**. Changing the expiry re-fetches that chain and auto-matches the closest strike. Calendar/Diagonal spreads work by giving each leg a different expiry.
> >
> > **Payoff diagram** — expiry P&L curve (amber) + Black-Scholes theoretical curve (blue dashed) on an HiDPI canvas. Date slider animates the theoretical curve from today to expiry.
> >
> > **Order flow**: Build → Preflight (cost + buying power + fees) → Confirm → Place.
> >
> > ### γ GEX
> > - Call GEX (green bars), Put GEX (red bars), Net GEX (amber line) per strike
> > - - All expirations grouped by week / month
> >   - - **Gamma Wall** — strike with highest absolute dealer gamma concentration
> >     - - **Zero Gamma** — interpolated price where net GEX crosses zero (market pivot)
> >       - - Auto-loads on tab click, resets on ticker change
> >        
> >         - ### 📈 Analytics
> >        
> >         - **IV Smile** — implied volatility vs strike for calls and puts. Shows the characteristic skew — OTM puts typically carry higher IV than OTM calls.
> >        
> >         - **Max Pain** — strike where option buyers face maximum dollar loss at expiry. Computed as aggregate intrinsic value across all strikes.
> >
> > **Put/Call Ratio** — call OI vs put OI per strike with P/C ratio line. Aggregate ratio with bullish/neutral/bearish label.
> >
> > **Implied Move** — ATM straddle price ÷ spot = expected ±% move. Visualised as a gradient price range band.
> >
> > **Volatility Surface** — pseudo-3D mesh of IV across all strikes and expirations. Perspective projection, heat-coloured (blue=low, red=high). Loads progressively, expiry by expiry.
> >
> > ---
> >
> > ## Safety
> >
> > - Confirmation modal required before every live order
> > - - Preflight must be run before Place Order enables
> >   - - No auto-trading — every order is explicit
> >     - - Rate limiting respected — Greeks fetched in sequential batches of 20
> >       - - ⚠️ This app places real orders in your live brokerage account
> >        
> >         - ---
> >
> > ## Project Structure
> >
> > ```
> > public-options-scanner/
> > ├── server.js                  # Express proxy — 8 API routes
> > ├── public/
> > │   └── index.html             # Full app — Scanner, Builder, GEX, Analytics
> > ├── package.json
> > ├── README.md
> > ├── SKILL.md
> > ├── demo.html                  # Animated showcase page
> > └── Option Scanner Demo.mp4    # Demo video
> > ```
> >
> > ---
> >
> > ## Built With
> >
> > - **Public.com API** — auth, market data, Greeks, order placement
> > - - **Node.js + Express** — CORS proxy
> >   - - **Vanilla JS + Canvas 2D** — all charts and visualisations, no external libraries
> >     - - **Black-Scholes** — implemented in ~20 lines for theoretical payoff curves
> >      
> >       - ---
> >
> > ## License
> >
> > MIT
> >
> > ---
> >
> > ## Submission
> >
> > Built for the [Public Skills Challenge](https://public.com/skills-challenge) — March 2026.
> > Tag: **#BuildWithPublic**
