# Improvement Ideas Backlog

⚠️ **IMPORTANT:** This file is a brainstorming backlog. It should **NOT** be referenced for feature development, bug fixes, or architectural decisions unless explicitly requested for ideation. Keep this separate from the main development workflow.

---

## Current Policy Context (Feb 2026)

Based on recent trade policy developments and think tank research (CSIS, BPC, CFR, Brookings, Heritage Foundation), policymakers are actively discussing:

1. **Trade Deficit Paradox** — Despite 27% peak effective tariff rates, the U.S. trade deficit increased to $901B in 2025 (0.2% improvement). Policy question: "Do tariffs work for their stated goal?"
2. **Consumer Price Pass-Through** — Tariffs added ~0.5pp to headline inflation in mid-2025; average household cost $1,000-1,300/year. Question: "Who bears the real cost?"
3. **Sectoral Vulnerability** — Automotive industry lost $4-5B (GM alone), car prices up $4,000, steel doubled to 50%, agriculture exports down 12%. Question: "Which sectors are most exposed?"
4. **Exemption Manipulation** — Initial 20% exemption carve-out (pharma, semiconductors, lumber), then Sept 2025 adjustments. Question: "What gets exempted and why?"
5. **Retaliatory Cascades** — Canada CA$155B response, Mexico tariffs, China tit-for-tat escalation then 90-day truce. Question: "What's the true cost of escalation?"
6. **Legal Vulnerabilities** — Supreme Court (6-3) struck down IEEPA tariffs in Feb 2026. Congressional repeal vote on Canada tariffs (219-211). Question: "Which tariffs are legally sustainable?"
7. **Tariff Revenue Explosion** — $287B collected in 2025 (+192% YoY). Question: "Is this a tax grab or trade remedy?"

These themes should inform view prioritization. Views addressing these questions will have the highest policy impact.

---

## ⭐ NEXT FEATURE: Trade Volume Integration (Bake-and-Freeze, Test Pass First)

**Goal:** Cross-reference existing tariff rules with real U.S. import volume data so the dashboard shows economic impact (dollars at stake), not just action counts.

**Core problem:** We have tariff rules but not trade flows. The dataset has 41 actions with duty rates and HS codes, but zero import values — so we can't answer "how much does this tariff actually cost?" This is the single highest-leverage data enrichment possible.

**Architecture decision:** Static bake-and-freeze (Option A). The scraper fetches Census Bureau data once, bakes it into `trade_actions.json` as a new `trade_volume` field, and commits it. No backend, no runtime API calls, no maintenance overhead. Refresh manually when data updates.

---

### Phase 1 — Manual Test Pass (5 actions, no new scraper code)

Add `trade_volume` to **5 high-confidence actions only** — the cleanest Section 232 tariffs where scope is unambiguous (all countries, specific HS chapters, fixed rate):

| Action ID | Product | Duty Rate | 2024 Import Volume | Est. Tariff Cost |
|-----------|---------|-----------|-------------------|-----------------|
| `csms-64348411-s232-steel` | Iron & Steel (HS Ch. 72–73) | 25% | ~$26B | ~$6.5B |
| `csms-64348288-s232-aluminum` | Aluminum (HS Ch. 76) | 25% | ~$18.5B | ~$4.6B |
| `csms-64624801-s232-autos` | Passenger Vehicles & Light Trucks | 25% | ~$200B | ~$50B |
| `csms-64913145-s232-autoparts` | Automobile Parts (non-USMCA) | 25% | ~$150B total; ~$90B taxable | ~$22.5B |
| `csms-65794272-s232-copper` | Copper (HS Ch. 74) | 50% on copper content | ~$4.2B | ~$1.5B |

**Why these 5:** All-country scope (no bilateral stacking complexity), fixed clean rate, well-defined HS chapter, all ACTIVE, highest absolute dollar impact.

**New field schema** (add to each action, optional on all others):
```json
"trade_volume": {
  "annual_import_usd_2024": 26000000000,
  "estimated_tariff_cost_usd": 6500000000,
  "data_source": "U.S. Census Bureau (HS Chapters 72–73, 2024)",
  "confidence": "medium",
  "note": "Covers total U.S. iron/steel imports. Estimate applies 25% rate to full chapter value; actual affected subset may vary due to product exclusions."
}
```

Confidence levels:
- `"high"` — exact HS chapter, all countries, fixed rate, no exemption complexity
- `"medium"` — minor exclusion caveats (e.g., 25+ yr old vehicles, drawback)
- `"low"` — significant exemption complexity (e.g., USMCA, copper content vs. article value)

**Frontend change — `ActionDetailModal.jsx`:** Add one new "Economic Impact" block after `duty_rate`, rendered only when `trade_volume` is present:
```
Economic Impact (Est.)
  2024 Import Volume      $26.0B
  Est. Annual Tariff Cost $6.5B    ← red
  [note text]
  Source: U.S. Census Bureau · Confidence: medium
```
Format: values in `$XB` / `$XT` shorthand. `estimated_tariff_cost_usd` in red. Source + confidence as muted footnote.

**Update both JSON files** (per data contract):
- `frontend/src/data/trade_actions.json`
- `frontend/public/data/trade_actions.json`

**No new hooks, no new views, no new files.** This is purely data enrichment + modal display.

**Test criteria for Phase 1:**
- Open any of the 5 enriched actions in the modal → "Economic Impact" section appears
- Open any non-enriched action → section absent (graceful hide)
- Numbers display correctly formatted (`$26.0B`, not `$26000000000`)
- Note and confidence footnote render without overflow

---

### Phase 2 — Census API Scraper Module (after Phase 1 validated)

Add `scraper/fetch_trade_volumes.py` to automate Phase 1 for all actions:

**Census Bureau endpoint (no API key required):**
```
https://api.census.gov/data/timeseries/intltrade/imports
  ?get=GEN_VAL_MO,I_COMMODITY,CTY_CODE
  &I_COMMODITY=72*    (HS chapter wildcard)
  &time=2024
  &CTY_CODE=5700      (e.g., China ISO numeric)
```

**Scope:** Fetch 2023 + 2024 annual data + latest 2025 monthly for the ~8 HS chapters covered by our actions: 72 (iron/steel), 74 (copper), 76 (aluminum), 84 (machinery), 85 (electronics), 87 (vehicles/parts), 44 (lumber), agricultural chapters.

**Country mapping needed:** Census uses ISO numeric codes (e.g., `5700` = China, `1220` = Canada, `2010` = Mexico). Add lookup table to `scraper/config.py`.

**Output:** Standalone `frontend/public/data/trade_volumes.json` with HS-chapter × country import values, plus a monthly time series for the top 5 chapters (for future front-loading surge view).

**Caching:** Extend `scraper/cache.py` to cache Census API responses for 7 days (trade data doesn't update frequently).

**Rate limits:** Census API allows ~500 req/day without a key. Caching makes this a non-issue on re-runs.

---

### Phase 3 — Weighted Map & Sectoral Views (after Phase 2)

Once `trade_volumes.json` exists:

1. **Map: color by dollar exposure** instead of action count — countries with $200B+ in affected imports show darker than countries with 2 tariff actions but $1B volume
2. **Sectoral Impact Dashboard** (BACKLOG #2) — powered by HS-to-sector mapping + Census volumes → bar chart of dollar exposure by industry (Automotive $200B+, Consumer Goods $150B+, Steel/Aluminum $45B)
3. **Summary cards upgrade** — replace "41 actions" with "$340B+ in affected imports" as the headline stat
4. **Trade Deficit Tracker** — monthly Census data + bilateral deficit figures from Census/USTR

---

### Data Notes & Caveats

- **Census data lag:** Annual 2024 data fully available by ~Mar 2025. Monthly 2025 data lags 6–8 weeks.
- **Chapter-level vs. action-level precision:** Section 232 tariffs often exclude specific HTS subheadings. Chapter-level import values are an upper bound; label all estimates accordingly.
- **USMCA exemption complexity:** Auto parts exempt if USMCA-qualifying. Census doesn't break out USMCA-eligible separately, so use rough country-of-origin proxy (Canada + Mexico × est. 65% USMCA qualification rate).
- **Copper duty is on copper content, not article value:** 50% applies to the copper content value only. Est. copper content ≈ 70% of HS Ch. 74 import value → effective rate on full article value ≈ 35%.
- **Superseded actions:** Only add `trade_volume` to `status: "active"` actions. Superseded actions show historical rates that no longer apply, so volume data would be misleading.
- **Source:** U.S. Census Bureau USA Trade Online — https://www.census.gov/foreign-trade/

### Industry View External Claims — Census API Backfill

The Industry Impact View (`industryMap.js`) has a two-tier citation system:
- **Verified (Tier 1):** Directly from CSMS bulletins with `csms_id` + `excerpt` — fully traceable.
- **External (Tier 2):** Government sources only with `source` + `url` — must link to a `.gov` page.

**Current state:** All external arrays are empty. External claims from non-government sources (Yale Budget Lab, Tax Foundation, Boston Fed, etc.) were removed. The test suite enforces that any `url` in external claims must point to a `.gov` domain.

**When Census API integration (Phase 2) is implemented, backfill these empty external arrays with real data:**

| Sector | What to add | Census query |
|--------|-------------|--------------|
| primary-metals | Annual import value for HS Ch. 72+73+74+76 | `I_COMMODITY=72*,73*,74*,76*` |
| semiconductors | Annual import value for HS Ch. 85 (electronic) | `I_COMMODITY=85*` |
| agriculture | Bilateral export changes (Mexico, China) | `I_COMMODITY=01*-24*&CTY_CODE=2010` |
| automotive | Auto/parts import value for HS Ch. 87 | `I_COMMODITY=87*` |
| consumer-goods | Tariff revenue collected | CBP/Treasury `.gov` report page |

Each backfilled claim must include:
- `source`: "U.S. Census Bureau", "CBP", "USDA", etc. (government entity)
- `url`: Direct link to a `.gov` page that produces the figure
- `value`: The actual figure from the API response, not a rough estimate

**Rules:**
- External claims must link to `.gov` domains only (enforced by test suite)
- Never add an external claim without a `url` that a user can click to verify the figure
- Text-only source attributions (e.g., "Policy analysis estimates") are not acceptable

### Future: Non-Government Source Integration (Tier 3)

Think tank and academic research (Yale Budget Lab, Tax Foundation, Boston Fed, Brookings, CSIS, etc.) provides valuable context like per-household cost estimates, price impact projections, and trade deficit analysis. These are currently documented in BACKLOG.md's research sections but are **not shown in the Industry View**.

**When ready to expand beyond .gov sources:**
1. Add a third citation tier: `research[]` — non-gov sources with `source` + `url` + `confidence`
2. Render with distinct visual treatment (e.g., lighter styling, "Research estimate" label) to clearly separate from government data
3. Update the `.gov`-only test constraint to allow a configurable allowlist of trusted domains
4. Candidate sources to add first:
   - Yale Budget Lab (auto tariff price impact)
   - Boston/SF/StL Federal Reserve (.gov — already qualifies if using fed.gov URLs)
   - Tax Foundation (tariff revenue tracking)
   - ITC research reports (usitc.gov — already qualifies)
5. Consider a user-facing toggle: "Show research estimates" (off by default)

---

## New Dashboard Views (Prioritized by Current Policy Impact)

### 0. USMCA 2026 Review Countdown & Risk Dashboard 🚨 [CRITICAL - TIME-SENSITIVE]
**NEW: Think tanks identify this as THE biggest trade event of 2026. CFR, CSIS, Baker Institute all tracking.**

July 1, 2026 is a hard deadline for USMCA renewal decision. Affects $2T in annual North American trade. High stakes for U.S., Canada, Mexico.

- **Countdown timer** to July 1, 2026 USMCA review deadline (now ~4.5 months away)
- **Scenario probabilities** based on Oxford Economics/industry analysis:
  - 50% baseline: Renegotiation + tariff removal on Mexico/Canada (negotiated down from 25%)
  - 35% status quo: Annual reviews continue, tariffs remain (elevated uncertainty)
  - 15% worst-case: Withdrawal or non-renewal, tariffs spike dramatically
- **Sectoral risk matrix**: Which sectors (autos, agriculture) most at risk under each scenario
- **Key negotiation topics** (based on CSIS, Baker Institute research):
  - Regional content rules (auto RoO)
  - Minimum U.S. content thresholds
  - China provisions (common treatment)
- **Bilateral negotiation tracker**: Show current US-Mexico and US-Canada bilateral talks + status
- **Related events timeline**: All three countries' domestic political calendars (elections, legislative sessions) that affect leverage
- **Useful for:** Supply chain planning, manufacturing location decisions, political risk assessment
- **Complexity:** Medium-High
- **Data dependencies:** USMCA legal text, negotiation timelines, industry position statements
- **Sources:**
  - [Inside the Mechanics of the 2026 USMCA Review - CSIS](https://www.csis.org/analysis/inside-mechanics-2026-usmca-review)
  - [USMCA Scenarios: North American trade at a crossroads - Oxford Economics](https://www.oxfordeconomics.com/resource/usmca-scenarios-north-american-trade-at-a-crossroads/)
  - [Tracking the 2026 USMCA Review - RethinkTrade](https://rethinktrade.org/trackingusmca2026/)
  - [Strategic Priorities for the 2026 USMCA Review - Baker Institute](https://www.bakerinstitute.org/research/strategic-priorities-2026-usmca-review)
  - [Trade Calendar 2026 - CFR](https://www.cfr.org/articles/trade-calendar-2026)

### 1. Trade Deficit Impact Tracker ⚖️ [HIGHEST PRIORITY]
Directly addresses the core policy contradiction: tariffs were supposed to reduce deficit, but didn't.
- Timeline chart: Effective tariff rate vs. trade deficit volume over time
- Show correlation (or lack thereof) between tariff actions and deficit reduction
- Breakdown by country (deficit with China, Canada, Mexico, etc.)
- Metric cards: "2025 deficit: $901B (+0.2% despite 27% peak tariff rate)"
- Useful for: Policy auditing, proving/disproving tariff efficacy
- **Complexity:** Low (only needs timeline data + deficit figures)
- **Data dependencies:** Need to integrate Census Bureau trade deficit data or link to source
- **Sources:** [U.S. trade deficits stay high in 2025 despite Trump's tariffs - Washington Post](https://www.washingtonpost.com/business/2026/02/19/tariffs-trade-deficit-2025/), [U.S. trade deficit totaled $901 billion in 2025 - CNBC](https://www.cnbc.com/2026/02/19/us-trade-deficit-totaled-901-billion-in-2025-despite-trumps-tariffs.html)

### 2. Sectoral Impact Dashboard 📈 [HIGH PRIORITY]
Directly addresses: "Which industries are hardest hit?"
- Dashboard showing sectoral breakdown: Automotive, Steel, Agriculture, Semiconductors, etc.
- For each sector: tariff rate | estimated price impact | volume impact | employment impact
- Cards showing specific impacts: "Auto: $4,000 price increase | GM: $4-5B annual losses"
- Timeline showing when sectoral tariffs were imposed and when impacts appeared
- Sector-specific retaliatory tariff impacts (agriculture -12% exports to Mexico)
- Useful for: Industry lobbying, supply chain planning, economic impact assessments
- **Complexity:** Medium
- **Data dependencies:** Need sector classification for HS codes + Census trade data
- **Sources:** [How 2025 Tariffs Are Reshaping the U.S. Automotive Industry - Fortune](https://www.fortunebusinessinsights.com/blog/us-automotive-industry-tariffs-impact-2025-11084), [Sector-Specific Impact: Trump Tariffs On US Industries 2025 - Farmonaut](https://farmonaut.com/usa/sector-specific-impact-trump-tariffs-on-us-industries-2025/)

### 3. Consumer Price & Inflation Tracker 💰 [HIGH PRIORITY]
Directly addresses: "What's the real cost to households?"
- Timeline: Tariff implementation → inflation contribution (0.5pp headlines, 0.4pp core)
- Consumer impact estimate: "$1,000-1,300 per household per year"
- Sector-specific price inflation: Durable goods (+4% above trend), imported goods vs. domestic
- Interactive calculator: "Estimate impact on your household based on consumption patterns"
- Comparative view: Tariff rate vs. actual price increases (pass-through %)
- Useful for: Consumer advocacy, Fed policy discussions, election messaging
- **Complexity:** Medium
- **Data dependencies:** Fed inflation data, sector price indices from BLS
- **Sources:** [How Tariffs Are Affecting Prices in 2025 - St. Louis Fed](https://www.stlouisfed.org/on-the-economy/2025/oct/how-tariffs-are-affecting-prices-2025), [The Effects of Tariffs on Inflation - San Francisco Fed](https://www.frbsf.org/research-and-insights/publications/economic-letter/2025/05/effects-of-tariffs-on-inflation-and-production-costs/)

### 4. Retaliatory Action Cascade Tracker 🔄 [HIGH PRIORITY]
Directly addresses: "What's the escalation pattern and is it escalating or de-escalating?"
- Sankey diagram or timeline showing tit-for-tat responses: US action → retaliatory response → counter-response
- Track by country: Canada CA$155B package (phased), Mexico counter-tariffs, China 90-day truce details
- Show lag times, escalation/de-escalation phases (e.g., May 2025 China truce, Nov 2025 extension)
- Metric cards: "Canada: 2 phases of CA$155B | China: Escalated to 125%, negotiated back to 10%"
- Useful for: Trade diplomacy analysis, risk assessment, understanding negotiation dynamics
- **Complexity:** Medium-High
- **Data dependencies:** Require tagging of actions as "retaliatory response to [CSMS #]" in scraper
- **Sources:** [Trump Tariffs: The Economic Impact of the Trump Trade War - Tax Foundation](https://taxfoundation.org/research/all/federal/trump-tariffs-trade-war/), [2025–2026 United States trade war with Canada and Mexico - Wikipedia](https://en.wikipedia.org/wiki/2025%E2%80%932026_United_States_trade_war_with_Canada_and_Mexico)

### 5. Legal Challenge & Congressional Action Tracker ⚖️ [HIGH PRIORITY]
Directly addresses: "Which tariffs are legally at risk?"
- Status tracker for each major tariff: Legal challenge? | Ruling status | Congressional repeal vote? | Outcome
- Highlight Supreme Court decision (Feb 2026): IEEPA tariffs struck down 6-3
- Show congressional votes: Canada tariff repeal (219-211 pass in Feb 2026)
- Timeline showing legal challenges filed, arguments, decisions
- Flag tariffs with pending challenges or constitutional questions
- Useful for: Risk assessment, compliance planning, understanding policy durability
- **Complexity:** Medium
- **Data dependencies:** Need to track legal case numbers, court decisions, congressional votes
- **Sources:** [Supreme Court strikes down Trump's sweeping tariffs - PBS News](https://www.pbs.org/newshour/politics/supreme-court-strikes-down-trumps-sweeping-tariffs/), [Presidential 2025 Tariff Actions: Timeline and Status - Congress.gov](https://www.congress.gov/crs-product/R48549)

### 6. Tariff Exclusion/Exemption Tracker 🛡️ [HIGH PRIORITY]
Directly addresses: "What gets carve-outs and why? How can I get my product exempted?"
- Dashboard showing exemption rate by tariff action (e.g., "20% of reciprocal tariff imports initially exempted")
- List of exempted product categories: Pharmaceuticals, semiconductors, medical supplies, lumber, copper
- Timeline of exemption changes: Initial April 2025 carve-outs, September 2025 adjustments
- For each exclusion request: Status (approved/pending/denied), expiration date, reason code
- Heat map: Which countries/sectors got more exemptions? (discrimination analysis)
- Useful for: Industry advocacy, supply chain planning, understanding favoritism patterns
- **Complexity:** Medium-High
- **Data dependencies:** Comprehensive CBP exclusion docket scraping + Federal Register notices
- **Sources:** [Federal Register Adoption and Procedures - Section 232 Steel and Aluminum](https://www.federalregister.gov/documents/2025/05/02/2025-07676/adoption-and-procedures-of-the-section-232-steel-and-aluminum-tariff-inclusions-process), [Reciprocal Tariff Exclusion for Specified Products - Gaia Dynamics](https://www.gaiadynamics.ai/blog/reciprocal-tariff-exclusion-for-specified-products-full-guide-2025/)

### 7. Tariff Revenue & Federal Finances 💵 [MEDIUM-HIGH PRIORITY]
Directly addresses: "Is this trade policy or taxation?"
- Timeline: Tariff revenue collected vs. announced rates ($287B in 2025, +192% YoY)
- Breakdown by tariff type: Section 301 revenue, Section 232 revenue, reciprocal tariff revenue, IEEPA revenue
- Comparative view: Revenue generated vs. stated policy goal (trade deficit reduction)
- Projection: "If trends continue, 2026 projected tariff revenue: $XXB"
- Useful for: Budget hawks, critics of tariff strategy, understanding fiscal impact
- **Complexity:** Low
- **Data dependencies:** CBP tariff revenue reports (publicly available)
- **Sources:** [U.S. trade deficit totaled $901 billion - CNBC](https://www.cnbc.com/2026/02/19/us-trade-deficit-totaled-901-billion-in-2025-despite-trumps-tariffs.html) (mentions $287B revenue)

### 9. Front-Loading & Import Surge Tracker 📦 [HIGH PRIORITY - HAPPENING NOW]
**NEW: CFR research identifies significant "front-loading" behavior — importers buying ahead of announced tariffs.**

Track whether importers are surging purchases before tariff implementation dates (actionable early signal of tariff effectiveness/evasion).

- **Import volume spike analysis**: Compare import volumes pre- vs. post- major tariff announcements
- **Timeline view**: Major tariff announcement dates with corresponding import volume changes
- **Categories affected**: Which product categories show strongest front-loading behavior
- **Revenue implications**: How front-loading artificially inflates tariff revenue in near-term before settling down
- **Forecasting**: If June 2026 has major tariff announcement, expect surge in May imports
- **Useful for:** Supply chain managers (planning when to import), policymakers (understanding tariff impact timing), revenue forecasters
- **Complexity:** Medium (needs Census/trade data)
- **Data dependencies:** Monthly import data by HS code from Census Bureau
- **Sources:** [Trade Trends to Watch in 2026 - CFR](https://www.cfr.org/articles/trade-trends-watch-2026)

### 10. Bilateral Trade Deal Tracker 🤝 [MEDIUM-HIGH PRIORITY]
**NEW: CFR and USTR track bilateral negotiations. This is competitive intelligence many industries/countries care about.**

Track status of ongoing bilateral trade agreement negotiations, frameworks, and signed deals.

- **Negotiation status board**: Each bilateral agreement (US-UK, US-Taiwan, US-Indonesia, etc.) with status (pre-negotiation, in progress, framework signed, finalized)
- **Timeline view**: When did negotiations start, any announced milestones, expected completion date
- **Key sectors per deal**: What sectors are covered (e.g., US-UK pharma/medical tech, US-Taiwan semiconductors)
- **Tariff implications**: Does this deal remove any existing tariffs? Add new market access?
- **Map view**: Visualize all active bilateral negotiations globally
- **Useful for:** Exporters (market access opportunities), import-competing industries (new competition threats), diplomacy trackers
- **Complexity:** Medium (mostly manual data entry + research)
- **Data dependencies:** USTR statements, CFR tracker, individual negotiation timelines
- **Sources:**
  - [Tracking Trump's Trade Deals - CFR](https://www.cfr.org/articles/tracking-trumps-trade-deals)
  - [Trade Calendar 2026 - CFR](https://www.cfr.org/articles/trade-calendar-2026)
  - [President's 2025 Trade Policy Agenda - USTR](https://ustr.gov/sites/default/files/files/reports/2025/President%20Trump%27s%202025%20Trade%20Policy%20Agenda.pdf)

### 11. Free Trade Agreement Expiration Calendar ⏰ [MEDIUM PRIORITY]
**NEW: Based on CSIS USMCA analysis — many other FTAs have upcoming reviews/expiration dates.**

Track all active FTAs and their expiration/review dates. USMCA 2026 is just the first critical deadline.

- **Calendar view**: All FTA expiration/review dates (USMCA July 2026, then what else?)
- **Risk heat map**: Which FTAs are most politically vulnerable to renegotiation/withdrawal
- **Negotiation history**: How has each FTA been modified since ratification
- **Trade volumes at stake**: Annual trade value under each FTA
- **Partner countries**: Show which countries each FTA affects
- **Useful for:** Supply chain managers (long-term planning), export industries (market access stability)
- **Complexity:** Low (mostly static calendar data)
- **Data dependencies:** USTR FTA database, expiration dates
- **Sources:** CSIS, USTR official records

### 12. Geopolitical Impact on Allies 🌍 [MEDIUM PRIORITY]
**NEW: CFR research on how U.S. tariffs are "shaking allies" — Canada, EU, Japan, Australia.**

Track how tariffs affect U.S. diplomatic relationships and alliance stability.

- **Ally sentiment tracker**: How Canada, EU, Japan, Australia are responding (retaliatory, diplomatic, WTO challenges)
- **Retaliation heat map**: Which allies are threatening/implementing counter-tariffs
- **Diplomatic incident timeline**: Major statements, visits, negotiations related to tariffs
- **Trade relationship risk scoring**: Green/yellow/red for each alliance's stability
- **Useful for:** Diplomacy analysts, supply chain managers (alliance stability affects supply security)
- **Complexity:** Medium (requires news monitoring + sentiment analysis)
- **Data dependencies:** News feeds, official statements, CFR analysis
- **Sources:** [Geopolitics of Trump Tariffs: How U.S. Trade Policy Has Shaken Allies - CFR](https://www.cfr.org/articles/geopolitics-trump-tariffs-how-us-trade-policy-has-shaken-allies)

### 13. Public Opinion & Consumer Sentiment Tracker 📊 [MEDIUM PRIORITY]
**NEW: CFR and other institutions polling Americans on tariff views. Interesting political economy data.**

Track what Americans actually think about tariffs (often different from what politicians assume).

- **Poll results dashboard**: CFR poll data on tariff support/opposition by demographic
- **Sentiment over time**: How has public opinion shifted as tariffs hit prices (Feb 2026 sentiment vs. April 2025)
- **Affordability concerns**: CFR poll shows strong bipartisan concern about tariffs → price increases
- **Partisan divide**: Where do Republicans vs. Democrats stand (if at all)
- **Useful for:** Political strategists, policymakers (gauge electoral risk), media
- **Complexity:** Low-Medium (mostly dashboard of existing polls)
- **Data dependencies:** CFR poll data, other polling organizations
- **Sources:** [CFR Poll Shows Americans Across Party Lines Tie Tariffs to Affordability - CFR](https://www.cfr.org/articles/cfr-poll-shows-americans-across-party-lines-tie-tariffs-to-affordability)

### 8. Average Effective Tariff Rate Timeline 📊 [MEDIUM PRIORITY]
Directly addresses: "How much has overall tariff protection actually increased?"
- Line chart: Effective tariff rate over time (started ~2.5% Jan 2025, peaked 27%, settled 16.8% by Nov 2025)
- Show major policy events that moved the rate (April 2 reciprocal tariffs, June doubling of steel/aluminum, etc.)
- Breakdown by tariff source: Section 301 contribution, Section 232, reciprocal, IEEPA
- Useful for: Understanding policy volatility, macroeconomic impact analysis
- **Complexity:** Low-Medium
- **Data dependencies:** Need to calculate effective rates from trade data (or integrate Fed/academic estimates)
- **Sources:** [Trump Tariffs: The Economic Impact - Tax Foundation](https://taxfoundation.org/research/all/federal/trump-tariffs-trade-war/)

### 9. Country Impact Matrix 🎯 [MEDIUM PRIORITY]
A heatmap showing the intersection of countries and action types.
- Cells colored by count/intensity
- Quickly identify which countries face most diverse restrictions
- Shows patterns like "China has 8 tariffs, 2 sanctions; Canada has 5 tariffs, 1 suspension"
- **Complexity:** Medium
- **Data dependencies:** None (use existing data)

### 10. HS Code Sectoral Impact 📊 [MEDIUM PRIORITY]
Group HS codes by economic sector (minerals, textiles, autos, semiconductors, etc.).
- Show which products are affected by what actions
- Count of active restrictions per sector
- Drill-down to specific codes within each sector
- Very useful for supply chain analysis
- **Complexity:** Medium
- **Data dependencies:** Need sector classification mapping for HS codes (external data or manual mapping)

### DEPRECATED (Lower current relevance):
**Federal Authority Breakdown**, **Duty Rate Comparison**, **Supersession/Status Flow**, **Exclusion & Waiver Tracker**, **Sectoral Concentration**, **Country Reciprocity Timeline**, **Combined Action Impact Score**

These are still useful but have lower priority given current policy debates. Re-prioritize if policy focus shifts.

---

## Old: Country Impact Matrix 🎯
A heatmap showing the intersection of countries and action types.
- Cells colored by count/intensity
- Quickly identify which countries face most diverse restrictions
- Shows patterns like "China has 8 tariffs, 2 sanctions; Canada has 5 tariffs, 1 suspension"
- **Complexity:** Medium
- **Data dependencies:** None (use existing data)

### 2. HS Code Sectoral Impact 📊
Group HS codes by economic sector (minerals, textiles, autos, semiconductors, etc.).
- Show which products are affected by what actions
- Count of active restrictions per sector
- Drill-down to specific codes within each sector
- Very useful for supply chain analysis
- **Complexity:** Medium
- **Data dependencies:** Need sector classification mapping for HS codes (external data or manual mapping)

### 3. Action Timeline Chain / Genealogy 🔗
Track "action genealogy" — when actions are superseded, retracted, or reinstated.
- Show flow: CSMS #63988467 (Canada 25% duty) → #63991510 (pause) → #64297449 (reimposed)
- Reveal policy indecision, negotiations, escalation patterns
- Sankey or flow diagram showing pending → active → superseded paths
- **Complexity:** Medium-High
- **Data dependencies:** Need to establish relationships between related CSMS numbers (scraper enhancement or manual mapping)

### 4. Federal Authority Breakdown ⚖️
Break down all actions by their legal authority (Section 301, Section 232, IEEPA, Executive Order, etc.).
- Timeline view of which authorities are most active
- Show "Executive Order 14193 drives 60% of 2025 actions"
- Useful for policy researchers tracking legal justifications
- **Complexity:** Low
- **Data dependencies:** None (already in data as `federal_authority`)

### 5. Duty Rate Comparison Across Countries 💰
For a given product/sector, show comparative tariff rates.
- Table: Country | HS Code | Action Type | Duty Rate
- Reveal discriminatory vs. uniform pricing strategies
- "Steel tariffs: 25% on all countries vs. 10% on allies"
- **Complexity:** Low-Medium
- **Data dependencies:** None (use existing `duty_rate` field)

### 6. Supersession / Status Flow 🔄
Sankey or flow diagram showing action state transitions.
- How many actions went from pending → active → superseded
- How many are still active after policy changes
- Reveal volatility in trade policy
- **Complexity:** Low-Medium
- **Data dependencies:** None (use existing `status` field)

### 7. Exclusion & Waiver Tracker 🛡️
Dedicated view for the `exclusion` action type + any exemptions mentioned in raw_excerpt.
- Often the "fine print" where real policy flexibility appears
- Policy makers & industry track these closely
- Table with expiration dates, reason codes, affected countries
- Integration with CBP exclusion request docket (see Data Augmentation section)
- **Complexity:** Medium
- **Data dependencies:** Enhanced scraper to extract exclusion-specific metadata

### 8. Sectoral Concentration 🏭
Show which sectors are most heavily restricted over time.
- Stacked area chart: Y-axis = number of active restrictions, X-axis = time
- Stacked by sector (autos, steel, semiconductor, etc.)
- Reveal which policy focus areas shift over time
- **Complexity:** Medium
- **Data dependencies:** Sector classification mapping for HS codes

### 9. Country Reciprocity Timeline 🔄
When US imposes action on Country X, show Country X's retaliatory actions.
- Timeline of Country X's response actions
- Lag time between action and retaliation
- Escalation patterns
- Useful for understanding trade war dynamics
- **Complexity:** Medium-High
- **Data dependencies:** Enhanced scraper to identify and tag retaliatory actions

### 10. Combined Action Impact Score 📈
Risk/exposure score for each country based on weighted factors.
- Calculation: (count × severity) + duty rate magnitude + sector diversity
- Severity weights: sanction (1.0) > tariff (0.7) > duty (0.6) > exclusion (0.3)
- Color-coded list: "High risk: China (score 8.5), Medium: Canada (5.2), Low: Mexico (2.1)"
- Shows which countries are most impacted overall
- **Complexity:** Medium
- **Data dependencies:** None (use existing data with weighting algorithm)

---

## Click-Through & Hover UX Enhancements

### Hover Previews (Low-friction discovery)
- **Country badges:** Hover → mini card showing active restrictions count, status breakdown, most recent action date
- **HS Code hover:** Show product category, base tariff rate, count of actions affecting it
- **Action type badges:** Hover → brief explanation + examples ("Tariff: Additional import duty imposed unilaterally")
- **Federal authority links:** Hover → definition with examples (e.g., "Section 301: USTR authority to retaliate for unfair trade practices")
- **Abbreviation tooltips:** Floating `[i]` icons for terms like IEEPA, USTR, HTS, Section 301, OFAC

### Detail Modal Tab Organization
Split the detail modal into tabs instead of long scroll:
1. **Overview** — current summary, status, key dates
2. **Legal & Authority** — FR link, CSMS number, executive order/legislation text
3. **Trade Impact** — affected countries, HS codes grouped by sector, estimated impact volume
4. **Timeline & Related** — action chain if superseded, related/retaliatory actions, cross-references
5. **Source Documents** — links to all authoritative sources (FR, CSMS, USTR, ITC, OFAC, etc.)
6. **Comments & Notices** — public comment periods, exclusion requests, docket information

### Expandable Row Details (Table view alternative)
Instead of modal, allow in-line expansion of table rows:
- Collapsed: title | type badge | countries | effective date | status badge
- Expanded: full summary, HS codes by sector, related actions, source links
- Click row to toggle expansion
- Useful for quick scanning without leaving table

### Action Genealogy Visualization
Timeline/Sankey showing action lineage:
```
CSMS #63988467 (Feb 4) - Canada 25% tariff [SUPERSEDED]
    ↓ (same day)
CSMS #63991510 (Feb 4) - Canada tariff paused [SUPERSEDED]
    ↓ (28 days)
CSMS #64297449 (Mar 4) - Canada tariff reimposed [ACTIVE]
```
Shows policy reversals, adjustments, and decision-making process.

### Context Cards (Right Sidebar in Modal)
Static or semi-expandable cards in modal sidebar:
- Federal Authority definition + relevant law citations
- Trade Volume Impact (if available from Census Bureau API)
- Status Timeline
- Exclusion Request Status Summary
- Related Actions Summary

---

## Data Augmentation from Authoritative Government Sources

### Tier 1: Quick Wins (Already Accessible via Web)

#### 1. Federal Register (FR) Links
- **Source:** `https://www.federalregister.gov/`
- **What it contains:** Full legal text, preamble, policy rationale, effective dates, FR citations
- **How to integrate:** Add to scraper to search by CSMS number or date range and capture `federal_register_url` and `federal_register_citation`
- **Data model addition:** `federal_register_url: str | None`, `federal_register_citation: str | None`
- **Display in UI:** "Click to read full FR notice" link in Legal & Authority tab
- **Effort:** Low (search-based, one-time per action)

#### 2. USTR Fact Sheets & Statements
- **Source:** `https://ustr.gov/` and sub-pages for trade remedies, Section 301, 232, IEEPA actions
- **What it contains:** Official policy rationale, country-specific impacts, negotiation status, official U.S. government position
- **How to integrate:** Scrape USTR trade remedy pages; link by action type and country
- **Data model addition:** `ustr_statement_url: str | None`, `ustr_summary: str | None` (excerpt from official statement)
- **Display in UI:** Summary card in Overview tab: "USTR Statement: [brief excerpt]" with link to full statement
- **Effort:** Medium (requires USTR page parsing and linking logic)

#### 3. Tariff Schedule Lookups (HTS)
- **Source:** `https://hts.usitc.gov/` (HTS Tariff Schedule database)
- **What it contains:** Base tariff rates, classification details, current effective rates
- **How to integrate:** For each HS code in action, query HTS schedule to get base rate + calculate total effective rate (base + additional duty)
- **Data model addition:** `tariff_schedule_details: { hs_code: str, product_desc: str, base_rate: str, effective_rate: str }[]`
- **Display in UI:** In Trade Impact tab: table showing "HTS 8471.30 | Computers | Base: 0% | Additional: 25% | Effective: 25%"
- **Effort:** Medium (API integration or scraping required)

#### 4. Trade Remedy Case Numbers (ITC)
- **Source:** `https://www.usitc.gov/` (antidumping, countervailing duty, safeguard investigations)
- **What it contains:** Case numbers, investigation status, affirmative/negative determinations, decision dates
- **How to integrate:** For antidumping/countervailing duty actions, cross-reference with ITC case database
- **Data model addition:** `itc_case_number: str | None`, `itc_case_status: str | None`, `itc_case_url: str | None`
- **Display in UI:** In Timeline & Related tab: "ITC Investigation 731-1234 | Status: Final affirmative determination (2025-02-15)" with link
- **Effort:** Medium (requires ITC case matching logic)

### Tier 2: Moderate Effort (Web scraping + Data processing)

#### 5. Section 301 Retaliation Lists
- **Source:** `https://ustr.gov/` (USTR publishes lists as PDFs, e.g., "List 4A", "List 4B")
- **What it contains:** Which products from which countries face tariffs, applicable rates, HTS codes
- **How to integrate:** Parse USTR Section 301 list PDFs; create reference table linking HS codes to retaliation list membership
- **Data model addition:** `section_301_list_id: str | None` (e.g., "4A", "4B"), `is_retaliation_list: bool`
- **Display in UI:** Badge in action title or Trade Impact tab: "Section 301 List 4A | Products affected by country"
- **Effort:** Medium-High (PDF parsing, deduplication)

#### 6. Exclusion Requests & Approvals
- **Source:** `https://www.cbp.gov/` (CBP publishes exclusion request decisions by docket)
- **What it contains:** Pending exclusion requests, approvals, denials by product/HS code and requesting party
- **How to integrate:** For tariff/duty actions, scrape corresponding CBP exclusion docket pages to count approved/pending/denied
- **Data model addition:** `exclusion_status: { approved_count: int, pending_count: int, denied_count: int }`, `exclusion_docket_url: str | None`
- **Display in UI:** In Trade Impact tab: Card showing "✓ 143 exclusions approved | ⏳ 27 pending | ✗ 8 denied | [View docket]"
- **Effort:** High (complex CBP docket structure, frequent updates)

#### 7. OFAC Sanctions Details (for Sanction Actions)
- **Source:** `https://home.treasury.gov/policy-issues/financial-sanctions/` (OFAC Sanctions programs and SDN list)
- **What it contains:** Sanctioned entities (SDN list), sanctions program details, effective dates
- **How to integrate:** For sanction-type actions, link to relevant OFAC program page
- **Data model addition:** `ofac_program_name: str | None`, `ofac_program_url: str | None`
- **Display in UI:** In Overview tab: "OFAC Program: Russian Oligarchs | Effective: 2022-03-10 | [View SDN list]"
- **Effort:** Low-Medium (straightforward linking, OFAC data is structured)

#### 8. WTO Notifications (if applicable)
- **Source:** `https://docs.wto.org/` (WTO Dispute Settlement and Trade Policy Review Database)
- **What it contains:** If action triggers WTO complaint or is notified under WTO rules
- **How to integrate:** Search WTO database by country and action type; link to WTO notifications
- **Data model addition:** `wto_notification_url: str | None`, `wto_case_number: str | None`, `wto_case_status: str | None`
- **Display in UI:** In Timeline & Related tab: Badge "WTO Complaint Filed | Case DS123" with link and status
- **Effort:** Medium (WTO data structure is complex, not all actions will have WTO notifications)

### Tier 3: High Effort / Nice-to-Have (External APIs, Census Bureau, etc.)

#### 9. Trade Volume Impact (Census Bureau API)
- **Source:** Census Bureau API (`https://api.census.gov/data`) - USA Trade Online database
- **What it contains:** Monthly import/export volumes by country and HS code, YoY changes
- **How to integrate:** Query Census API for each affected country/HS code combination; cache results
- **Data model addition:** `trade_volume: { country: str, hs_code: str, annual_value_usd: float, monthly_change_pct: float, affected_period: str }`
- **Display in UI:** In Trade Impact tab: "2024 Import volume: $2.3B | YoY change: -15%"
- **Effort:** High (API integration, data caching, frequent updates needed)
- **Note:** Census API has rate limits; caching essential

#### 10. ITC Economic Impact Assessments
- **Source:** `https://www.usitc.gov/research` (ITC economic reports, fact sheets)
- **What it contains:** Sectoral impacts, estimated job effects, GDP impacts, industry-specific analyses
- **How to integrate:** Search ITC research database by action type and country; link to relevant reports
- **Data model addition:** `itc_report_url: str | None`, `estimated_job_impact: str | None` (e.g., "-5,000 jobs")
- **Display in UI:** In Trade Impact tab: Card showing "Est. job impact: -5,000 | Affected sectors: Auto parts, Semiconductors"
- **Effort:** High (ITC reports are varied and not machine-readable; may require manual mapping)

#### 11. Retaliatory Action Timeline Auto-Detection
- **Source:** Internal (parse all actions for country-to-country patterns)
- **What it contains:** Automatically detect and link retaliatory actions
- **How to integrate:** Build relationship engine in scraper; tag actions as "retaliatory response to [CSMS #XXX]"
- **Data model addition:** `related_actions: { action_id: str, relationship: Literal["retaliatory_response", "supersedes", "reverses", "modifies"] }[]`
- **Display in UI:** In Timeline & Related tab: Visual timeline showing "US action (Feb 4) → Canada retaliation (Feb 10) → US counter-retaliation (Feb 25)"
- **Effort:** Very High (requires natural language processing or manual tagging for initial seed data)

---

## Implementation Priority Suggestions

### PHASE 1A (CRITICAL - TIME-SENSITIVE, Feb-June 2026)
**Goal: Deploy time-sensitive views for imminent policy events**

**USMCA 2026 deadline is July 1, 2026 (4.5 months away). Industry needs early signal tracking.**

1. **USMCA 2026 Review Countdown & Risk Dashboard** (medium-high effort, CRITICAL time-sensitive)
   - **Why urgently:** July 1, 2026 is a hard deadline. Industries need to plan now.
   - Countdown timer, scenario probabilities (50% renegotiation | 35% status quo | 15% worst-case)
   - Key negotiation topics tracker (regional content rules, China provisions)
   - Bilateral negotiation status (US-Mexico talks, US-Canada talks)
   - Sectoral risk matrix (autos, agriculture most vulnerable)
   - Effort: 2-3 days (mostly manual data entry + CSIS/Baker Institute research integration)
   - **Why:** This is THE biggest trade policy event of 2026. Every auto manufacturer, agricultural association, supply chain manager is anxiously watching this.

2. **Legal Challenge & Congressional Action Tracker** (low-medium effort, CRITICAL for risk assessment)
   - Supreme Court ruling status, Congressional repeal votes
   - Effort: 1 day (manual data entry + UI)
   - **Why:** Feb 2026 Supreme Court just struck down IEEPA tariffs. Flags which actions survive legal scrutiny.

3. **Enhance detail modal with tabs + government source links** (low effort, force multiplier)
   - Split into tabs: Overview | Legal & Authority | Trade Impact | Timeline | Source Docs
   - Effort: 1-2 days
   - **Why:** Multiplies value of all other views by 2-3x.

### PHASE 1B (IMMEDIATE, High Impact, Low Effort)
**Deploy before end of Q1 2026**

1. **Trade Deficit Impact Tracker** (medium effort)
   - Timeline: tariff rate vs. trade deficit
   - Answers "Do tariffs work?" — central policy debate
   - Effort: 2-3 days

2. **Tariff Revenue & Federal Finances** (low effort, high signal)
   - $287B revenue tracking, BPC real-time tracker analysis
   - "Is this trade policy or a tax grab?"
   - Effort: 1 day
   - High payoff: BPC, CBO, Tax Foundation all focused on this

3. **Front-Loading & Import Surge Tracker** (medium effort, happening now)
   - Shows importers gaming the system by surging purchases ahead of tariffs
   - Effort: 2 days (Census Bureau trade data)
   - **Why:** CFR identifies this as major dynamic in 2025-26. Very newsworthy.

### PHASE 1C (Important, Medium Effort)
**Deploy end of Q1 / early Q2 2026**

1. **Tariff Exclusion/Exemption Tracker** (high effort, high value)
   - Show exemption carve-outs, timeline of changes (April → Sept 2025)
   - Heat map: which countries/sectors got preferential exemptions
   - Effort: 3-5 days (CBP docket scraping + FR parsing)
   - **Why:** Extremely valuable for industry compliance and lobbying. Tracks "favoritism."

2. **Sectoral Impact Dashboard** (medium effort, broad appeal)
   - Automotive, steel, agriculture breakdown with specific impacts
   - Effort: 2-3 days (needs HTS-to-sector mapping)

### PHASE 2 (High Value, Medium-High Effort)

1. **Bilateral Trade Deal Tracker** (medium effort, competitive intelligence)
   - US-UK, US-Taiwan, US-Indonesia, ongoing negotiations
   - Effort: 1-2 days (mostly manual, CFR tracker + USTR statements)
   - **Why:** CFR, USTR actively tracking. Industries want to know about new market access/competition.

2. **Consumer Price & Inflation Tracker** (medium effort)
   - Inflation contribution, household cost estimate
   - Effort: 2-3 days (Fed data)

3. **Retaliatory Action Cascade Tracker** (high effort, escalation dynamics)
   - Sankey/timeline showing Canada, Mexico, China responses
   - Effort: 3-4 days (requires scraper tagging)

4. **Geopolitical Impact on Allies** (medium effort, diplomatic risk)
   - Ally sentiment tracker, retaliation heat map
   - Effort: 2-3 days (news monitoring + analysis)

5. **Free Trade Agreement Expiration Calendar** (low effort, long-term planning)
   - All FTA expiration/review dates beyond USMCA
   - Effort: 1 day (mostly static calendar)

6. **Average Effective Tariff Rate Timeline** (low-medium effort, macro view)
   - 2.5% → 27% → 16.8% line chart with policy events
   - Effort: 1-2 days

### PHASE 3 (Medium Priority, Interesting but not urgent)

1. **Country Impact Matrix** (medium effort, policy diagnostics)
2. **HS Code Sectoral Impact** (medium effort, supply chain planning)
3. **Combined Action Impact Score** (medium effort, risk scoring)
4. **Public Opinion & Consumer Sentiment Tracker** (low effort, political economy)

### PHASE 4+ (Nice-to-Have, Highest Effort)

1. **Retaliatory action auto-detection** (NLP/ML, very high effort)
2. **Census Bureau trade volume integration** (API, ongoing maintenance)
3. **ITC economic impact assessments** (semi-manual)
4. **WTO notification tracking** (low traffic)
5. **Border carbon adjustment tracker** (BPC climate+trade integration)

---

## Current Policy Context & Research Sources (Feb 2026)

This backlog was updated based on web research (Feb 20, 2026) analyzing tariff impacts and current policy debates. Key findings:

### Trade Deficit Paradox
- **Finding:** Despite peak 27% effective tariff rate, U.S. trade deficit increased slightly in 2025 to $901B (only 0.2% improvement vs. 2024)
- **Sources:**
  - [U.S. trade deficits stay high in 2025 despite Trump's tariffs - Washington Post](https://www.washingtonpost.com/business/2026/02/19/tariffs-trade-deficit-2025/)
  - [U.S. trade deficit totaled $901 billion in 2025 - CNBC](https://www.cnbc.com/2026/02/19/us-trade-deficit-totaled-901-billion-in-2025-despite-trumps-tariffs.html)
  - [Tariff tracker & timeline - Congress.gov](https://www.congress.gov/crs-product/R48549)
- **Policy Question:** "Do tariffs actually reduce deficits?"

### Consumer Price & Inflation Impact
- **Finding:** Tariffs contributed 0.5pp to headline inflation (0.4pp core) in mid-2025; estimated $1,000-1,300 per household annual cost
- **Sectoral impacts:** Durable goods up 4% above pre-2025 trend; imported prices 4% above trend vs. domestic 2% above
- **Sources:**
  - [How Tariffs Are Affecting Prices in 2025 - St. Louis Federal Reserve](https://www.stlouisfed.org/on-the-economy/2025/oct/how-tariffs-are-affecting-prices-2025)
  - [Effects of Tariffs on Inflation - San Francisco Federal Reserve](https://www.frbsf.org/research-and-insights/publications/economic-letter/2025/05/effects-of-tariffs-on-inflation-and-production-costs/)
  - [Who Will Pay for Tariffs - Boston Federal Reserve](https://www.bostonfed.org/publications/current-policy-perspectives/2025/who-pays-for-tariffs.aspx)
- **Policy Question:** "Who bears the cost? Consumers or corporations?"

### Sectoral Impacts (Automotive, Steel, Agriculture)
- **Automotive:** 25% steel/aluminum tariffs, 50% by June 2025. GM reported $4-5B annual losses. Consumer vehicle prices up ~$4,000. Auto insurance premiums +8%.
- **Steel:** 25% tariff on virtually all sources (eliminated exemptions Feb 2025). Cascading impact on construction, appliances, machinery.
- **Agriculture:** Exports to Mexico down 12% due to Mexican retaliatory tariffs. China retaliation hit soybean, pork, specialty crops.
- **Sources:**
  - [How 2025 Tariffs Are Reshaping the U.S. Automotive Industry - Fortune Business Insights](https://www.fortunebusinessinsights.com/blog/us-automotive-industry-tariffs-impact-2025-11084)
  - [Sector-Specific Impact: Trump Tariffs On US Industries 2025 - Farmonaut](https://farmonaut.com/usa/sector-specific-impact-trump-tariffs-on-us-industries-2025/)
  - [Fiscal, Economic, and Distributional Effects of 25% Auto Tariffs - Yale Budget Lab](https://budgetlab.yale.edu/research/fiscal-economic-and-distributional-effects-25-auto-tariffs)
- **Policy Question:** "Which sectors deserve protection? Who gets hurt?"

### Retaliatory Action Cascades
- **Canada:** Announced CA$155B tariff package in two phases (Feb 2025)
- **Mexico:** Prepared counter-tariffs on pork, cheese, produce, steel, aluminum
- **China:** Escalated tit-for-tat (125% tariffs peak) then negotiated 90-day truce (May 2025), extended Nov 2025 through Nov 10, 2026
- **Sources:**
  - [Trump Tariffs: The Economic Impact - Tax Foundation](https://taxfoundation.org/research/all/federal/trump-tariffs-trade-war/)
  - [2025–2026 United States trade war with Canada and Mexico - Wikipedia](https://en.wikipedia.org/wiki/2025%E2%80%932026_United_States_trade_war_with_Canada_and_Mexico)
  - [Fact Sheet: President Trump Imposes Tariffs - The White House](https://www.whitehouse.gov/fact-sheets/2025/02/fact-sheet-president-donald-j-trump-imposes-tariffs-on-imports-from-canada-mexico-and-china/)
- **Policy Question:** "Are tariffs leading to negotiation or escalation?"

### Exemption/Exclusion Dynamics
- **Initial exemptions (April 2025):** ~20% of reciprocal tariff imports carved out, including pharma, semiconductors, medical supplies, lumber, copper
- **Section 232 (Steel/Aluminum):** Exclusion process ended Feb 10, 2025 — no new exclusions accepted
- **Section 301:** Some machinery exclusions renewed (164 tariffs extended, 14 exclusions granted)
- **Sept 2025 adjustments:** Executive Order narrowly revised scope of reciprocal tariff exemptions
- **Sources:**
  - [Federal Register: Section 232 Steel/Aluminum Procedures](https://www.federalregister.gov/documents/2025/05/02/2025-07676/adoption-and-procedures-of-the-section-232-steel-and-aluminum-tariff-inclusions-process)
  - [Reciprocal Tariff Exclusion for Specified Products - Gaia Dynamics](https://www.gaiadynamics.ai/blog/reciprocal-tariff-exclusion-for-specified-products-full-guide-2025/)
  - [CBP Guidance: Reciprocal Tariff Exclusion - CSMS #64724565](https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3db9e55)
- **Policy Question:** "What gets protected? Is exemption process transparent and fair?"

### Legal Challenges & Sustainability
- **Supreme Court ruling (Feb 20, 2026):** 6-3 decision struck down IEEPA-based tariffs in Learning Resources v. Trump
- **Congressional action (Feb 2026):** House passed resolution to repeal Canada tariffs (219-211 vote), with some Republican defections
- **Source:**
  - [Supreme Court strikes down Trump's sweeping tariffs - PBS News](https://www.pbs.org/newshour/politics/supreme-court-strikes-down-trumps-sweeping-tariffs/)
- **Policy Question:** "Which tariffs will survive legal challenges?"

### Tariff Revenue
- **Total collected in 2025:** $287 billion
- **Year-over-year growth:** +192%
- **Questions:** Is this trade policy or a new federal revenue stream?

### Average Effective Tariff Rates
- **Jan 2025 baseline:** 2.5%
- **Peak (April 2025 "Liberation Day" reciprocal tariffs):** 27%
- **Nov 2025 after negotiations:** 16.8%
- **Shows:** Significant volatility and room for negotiation

---

## Think Tank Research Summary (Feb 2026)

This backlog was further enriched by analyzing current research from major policy institutions across the political spectrum:

### CSIS (Center for Strategic and International Studies)
- **Primary focus:** 2026 USMCA review mechanics and renegotiation scenarios
- **Key research:** [Inside the Mechanics of the 2026 USMCA Review - CSIS](https://www.csis.org/analysis/inside-mechanics-2026-usmca-review)
- **Key finding:** USMCA review is "the biggest trade negotiation of 2026" with July 1 hard deadline
- **Implications:** Auto and agriculture sectors face major structural changes to RoOs and regional content

### Bipartisan Policy Center (BPC)
- **Primary focus:** Tariff revenue as fiscal policy issue (not just trade)
- **Key research:** [U.S. Tariff Tracker - BPC](https://bipartisanpolicy.org/explainer/tariff-tracker/) + [Designing Climate and Trade Policy - BPC](https://bipartisanpolicy.org/report/designing-a-climate-and-trade-policy-fit-for-the-united-states/)
- **Key finding:** $287B in tariff revenue (2025) is reframing tariff debate from "trade remedy" to "federal revenue stream"
- **Emerging area:** Climate-trade policy linkage (border carbon adjustments)

### Council on Foreign Relations (CFR)
- **Primary focus:** Tracking bilateral negotiations, public opinion, front-loading behavior
- **Key research:**
  - [Tracking Trump's Trade Deals - CFR](https://www.cfr.org/articles/tracking-trumps-trade-deals)
  - [Trade Trends to Watch in 2026 - CFR](https://www.cfr.org/articles/trade-trends-watch-2026)
  - [Geopolitics of Trump Tariffs: How U.S. Trade Policy Has Shaken Allies - CFR](https://www.cfr.org/articles/geopolitics-trump-tariffs-how-us-trade-policy-has-shaken-allies)
  - [CFR Poll Shows Americans Across Party Lines Tie Tariffs to Affordability - CFR](https://www.cfr.org/articles/cfr-poll-shows-americans-across-party-lines-tie-tariffs-to-affordability)
- **Key findings:**
  - "Front-loading" (importers surging purchases ahead of tariffs) is major dynamic
  - U.S. bilateral negotiations with Indonesia, Taiwan, UK actively underway
  - Americans overwhelmingly tie tariffs to affordability concerns (bipartisan)
  - Tariffs are damaging alliance relationships with Canada, EU, Japan, Australia
- **Implications:** Need to track import surge patterns, negotiate status, public sentiment

### Brookings Institution
- **Primary focus:** Macroeconomic impacts (reciprocal tariffs, currency effects, discretionary trade policy)
- **Key research:**
  - [Tracking trade amid uncertain and changing tariff policies - Brookings](https://www.brookings.edu/articles/tracking-trade-amid-uncertain-and-changing-tariff-policies/)
  - [Is US trade policy on a new path? - Brookings](https://www.brookings.edu/articles/is-us-trade-policy-on-a-new-path/)
  - [Trade war and the dollar anchor - Brookings BPEA Conference](https://www.brookings.edu/wp-content/uploads/2025/09/2_Hassan-et-al_unembargoed.pdf)
  - [Key takeaways on Trump's reciprocal tariffs - Brookings](https://www.brookings.edu/articles/key-takeaways-on-trump-reciprocal-tariffs-from-recent-brookings-event/)
- **Key findings:**
  - Reciprocal tariffs (April 2025) introduced baseline 10% + country-specific rates based on bilateral balances
  - Tariffs may weaken U.S. dollar as safe-haven currency
  - Shift from "rules-based" to "executive discretionary" trade policy is structural change
- **Implications:** Need to track effective tariff rates, bilateral balance metrics, currency impacts

### Heritage Foundation
- **Primary focus:** Tariffs as diplomatic/negotiating tool; alternative tariff mechanisms
- **Key research:** Multiple commentaries on tariff effectiveness, negotiation tactics, revenue structures
- **Key finding:** Alternative approaches like export-import adjustment (7% rate) could raise $600B over decade
- **Implications:** Not all tariff policy questions have single "tariff rate" answer; structure matters

### Baker Institute & Oxford Economics
- **Primary focus:** USMCA 2026 scenario planning and renegotiation probability
- **Key research:**
  - [Strategic Priorities for the 2026 USMCA Review - Baker Institute](https://www.bakerinstitute.org/research/strategic-priorities-2026-usmca-review)
  - [USMCA Scenarios: North American trade at a crossroads - Oxford Economics](https://www.oxfordeconomics.com/resource/usmca-scenarios-north-american-trade-at-a-crossroads/)
- **Key finding:** Oxford scenario analysis:
  - 50% probability: Renegotiation with most US tariffs on Canada/Mexico removed
  - 35% probability: Status quo with annual reviews and elevated tariff uncertainty
  - 15% probability: Withdrawal/non-renewal with tariff rate spike
- **Implications:** Dashboard should surface these probabilities and track movement between scenarios

### RethinkTrade
- **Primary focus:** Real-time USMCA 2026 tracking (practitioner-focused)
- **Key research:** [Tracking the 2026 USMCA Review - RethinkTrade](https://rethinktrade.org/trackingusmca2026/)
- **Useful for:** Integrating practitioner insights on what's actually being negotiated vs. announced

---

## Data Source Integration Roadmap

### For Trade Deficit Tracking
- **Source:** Census Bureau USA Trade Online or USTR trade data
- **Frequency:** Monthly release (typically mid-month for prior month)
- **Integration:** Either API query or import static CSV
- **Key metric:** Total merchandise trade deficit + breakdown by country

### For Sectoral Impacts
- **Source:** ITC DataWeb, Census Bureau by sector
- **Key need:** HTS code-to-sector classification (ITC publishes this)
- **Data:** Import volumes, values, and prices by sector and country
- **Effort:** One-time mapping of HTS codes to sectors; thereafter data pulls are routine

### For Consumer Price Impacts
- **Source:** BLS Inflation data (PPI/CPI), Federal Reserve analysis
- **Integration:** BLS API or import monthly CPI/PPI series
- **Key metrics:** PCE headline/core, durable goods prices, import price indices

### For Exemption Tracking
- **Source:** CBP exclusion dockets, Federal Register notices
- **Frequency:** Updates weekly as new exclusion decisions posted
- **Integration:** Scrape CBP website + FR for new notices
- **High priority:** This is competitive advantage info for industry

### For Legal Tracking
- **Source:** SCOTUS decisions, Congress.gov bills/votes
- **Frequency:** Real-time as decisions/votes occur
- **Integration:** Manual entry or subscribe to RSS feeds
- **Low frequency:** Court decisions happen slowly; votes are discrete events

---

## Strategic Positioning vs. Existing Trackers

Think tanks (BPC, CFR, Brookings) have built tariff trackers, but each has gaps. This tool can differentiate by filling those gaps:

| Feature | BPC Tracker | CFR Tracker | Brookings | This Tool (Vision) |
|---------|-------------|-------------|-----------|-------------------|
| **Real-time tariff revenue** | ✅ (main focus) | ✗ | Limited | ✅ + contextualized |
| **Bilateral negotiation status** | ✗ | ✅ (good) | Limited | ✅ Integrated |
| **USMCA 2026 countdown** | ✗ | Limited | ✗ | ✅ **Specialized** |
| **Exemption/exclusion tracking** | ✗ | ✗ | ✗ | ✅ **Unique** |
| **Legal challenge status** | ✗ | ✗ | ✗ | ✅ **Unique** |
| **Retaliatory cascade mapping** | ✗ | ✗ | ✗ | ✅ **Unique** |
| **Front-loading pattern detection** | ✗ | Noted | ✗ | ✅ **Unique** |
| **CSMS-to-policy linker** | ✗ | ✗ | ✗ | ✅ **Foundational** |
| **Public opinion polling** | ✗ | ✅ (embedded) | ✗ | ✅ Can integrate |
| **Sectoral impact detail** | ✗ | ✗ | Limited | ✅ **Deep** |

**Unique value proposition:**
- Only tool combining government source documents (CSMS, FR, CBP guidance) WITH think tank policy analysis
- Specialized focus on what policy thinks tanks identify as "open questions" (USMCA, exemption fairness, front-loading)
- Direct linkage from tariff action → exemption requests → legal challenges → negotiation status
- Real-time updates possible (others are static or slow-update)

**Target users:**
- **Policy analysts** at think tanks, Congressional Budget Office, USTR
- **Supply chain managers** (auto OEMs, steel, agriculture, semiconductors) — need time-sensitive alerts for USMCA and front-loading
- **Industry associations** (NAM, AECA, etc.) — need exemption tracking and sectoral impact detail
- **Trade lawyers** — need legal challenge status and federal authority analysis
- **Investors/economists** — want to see tariff revenue, deficit paradox, currency impacts
- **Media** — looking for comprehensive tariff explainers and "what's coming" analysis

---

## Map Visualization Improvements

### Quick Wins
- **Zoom & Pan** — Add `<ZoomableGroup>` from react-simple-maps for drag-to-pan and scroll-to-zoom. Helps with small European/Caribbean countries that are hard to click at default zoom.
- **Animate choropleth on filter change** — CSS transitions on fill color so countries smoothly shift color when filters update.
- **Country search / jump-to** — Search input above the map to highlight and auto-select a country by name.

### Medium Effort
- **Bubble overlay for "All" actions** — Translucent overlay or pulsing dot representing global actions, instead of just a text badge.
- **Mini sparklines in detail panel** — Tiny timeline per country showing when actions were enacted.
- **Action type filter on map** — Toggle buttons (tariff/duty/embargo/etc.) to re-color choropleth for just that type.
- **Heatmap mode toggle** — Switch between "count of actions" and "highest duty rate" coloring. Requires parsing duty_rate into numeric values.

### Higher Effort
- **Timeline scrubber** — Horizontal date slider below the map to see map state at any point in time.
- **Comparison mode** — Select two countries for side-by-side breakdown of trade actions, duty rates, and timelines.
- **Region grouping** — Color by region (EU, ASEAN, Americas) with expandable sub-groupings.

---

## Engineering & UX Improvements

### Quick Wins

#### 1. Shareable Filter URLs
Encode current filter state (countries, types, statuses, date range, search text) into URL query parameters so users can share a filtered view via link.
- **Example:** `#table?countries=China,Canada&type=tariff&status=active`
- **Effort:** Low (serialize/deserialize filter state to/from `window.location.search`)
- **Why:** Users frequently want to share "show me all active China tariffs" with colleagues

#### 2. Date Quick-Filter Presets
Add preset buttons above the date range inputs: "Last 30d", "Last 90d", "2025", "2026", "All".
- One click sets both start and end date
- **Effort:** Low (just sets date filter values)
- **Why:** Most users want common ranges, not arbitrary date pickers

#### 3. Search Result Highlighting
When text search is active, highlight matching terms in the table rows and dashboard cards.
- Use `<mark>` tags or CSS background highlight on matched substrings in title/summary fields
- **Effort:** Low-Medium (string matching + safe HTML rendering)
- **Why:** Hard to see why a result matched when scanning long titles/summaries

### Medium Effort

#### 4. Keyboard Accessibility
- Escape key closes modals, dropdowns, and detail panels
- Arrow keys navigate table rows and map country selection
- Tab focus visible on all interactive elements (buttons, filters, rows)
- Enter key opens detail modal from focused table row
- **Effort:** Medium (event listeners + focus management)
- **Why:** Power users and accessibility compliance; currently mouse-only

#### 5. Mobile/Tablet Responsiveness
Dashboard currently targets min 1024px desktop. Add responsive breakpoints:
- Stack filter panel vertically on small screens
- Single-column chart layout on tablet
- Swipeable views on mobile
- Collapsible table columns (hide Summary, HS Codes on small screens)
- **Effort:** Medium-High (Tailwind responsive classes + layout restructuring)
- **Why:** Policy analysts check this on phones during meetings

#### 6. Bundle Code-Splitting
Lazy-load heavy dependencies per view to reduce initial bundle (currently 882KB):
- `React.lazy()` for MapView (react-simple-maps + TopoJSON ~180KB)
- `React.lazy()` for DashboardView (Recharts ~150KB)
- Keep TableView in main bundle (lightest, most common entry point)
- **Effort:** Medium (dynamic imports + Suspense boundaries)
- **Why:** Initial load is slow on mobile; table-only users pay for map+charts they never see

### Higher Effort

#### 7. Automated Data Refresh via GitHub Actions Cron
Add a scheduled GitHub Actions workflow that runs the scraper weekly and auto-commits updated `trade_actions.json`.
- Cron: `0 6 * * 1` (Monday 6am UTC)
- Requires `ANTHROPIC_API_KEY` as GitHub Actions secret
- Auto-commit + push triggers deploy workflow
- **Effort:** Medium (Actions workflow + secret management + error handling)
- **Why:** Currently data updates require manual local scraper runs

#### 8. E2E Tests (Playwright)
Add end-to-end tests covering full user workflows:
- Load app → apply filters → switch views → click action → verify modal
- Filter persistence across view switches
- URL hash routing (direct navigation to `#map`, `#table`)
- CSV export downloads file
- **Effort:** High (Playwright setup + test authoring + CI integration)
- **Why:** Unit tests don't catch integration bugs between views/filters/routing

### Bug Fixes

#### 9. Filter Panel Expanded State Persists Across View Switches
When the filter panel is expanded in Table view and user switches to Dashboard, the expanded/collapsed state carries over. Consider:
- Auto-collapse on view switch (cleaner UX)
- Or persist intentionally (user preference)
- Currently inconsistent — sometimes stays expanded, sometimes collapses depending on render timing
- **Effort:** Low (controlled state reset in view toggle handler)
- **Why:** Minor UX inconsistency noticed during testing

---

## Notes for Future Reference

- All gov source integrations should gracefully degrade (i.e., if a source is unavailable, show "Data not available" rather than crashing)
- Caching is essential for external API calls (especially Census Bureau, BLS)
- HS code sector classification will need to be maintained as a reference table (ITC publishes this)
- Some actions may not map to multiple gov sources—this is normal
- Always link to source documents, don't embed full content (respect copyright, reduce bundle size)

### Critical Success Factors
- **Legal/Constitutional risk:** IEEPA tariffs just struck down by SCOTUS. Flagging legal vulnerabilities will drive credibility with lawyers and risk managers.
- **USMCA 2026 countdown:** This is the "moon shot" feature. If you can build this as definitive tracker and supply chain managers use it for July 2026 planning, you own that niche.
- **Exemption transparency:** Exemption/exclusion data is opaque and dispersed across CBP dockets. Centralizing this will be high-value for industry.
- **Front-loading detection:** Show which product categories are surging imports ahead of tariffs. This is real-time intelligence other trackers don't have.
- **Trade deficit paradox:** Clear, compelling visualization of "tariff rate vs. deficit over time" will be widely cited and drive engagement.
- **Think tank integration:** Reference CSIS, BPC, CFR, Brookings research in your views. This positions the tool as "powered by expert research, not just data."
- **Exemption sensitivity:** Exemption decisions are high-stakes for industry. This data will attract sophisticated, well-funded users (lobbyists, supply chain managers, trade lawyers).
