# AI Logistics Concierge (demo)

An AI-first booking experience for a Pakistani logistics company: one ChatGPT-style chatbox replaces the usual booking forms.

**Live demo:** https://hamzaansari22.github.io/Client-Pitch-Logistics/

The demo covers **Phase 1** of the roadmap: **understand** the request → **route** it to the right journey → **collect only the missing details** → hand a **structured request** to the operations team.

> The public build uses a placeholder brand name, “Rawana”. Add `?brand=YourBrand` to the URL to show any company name live, for example
> `https://hamzaansari22.github.io/Client-Pitch-Logistics/?brand=Acme`. Nothing about the client is committed to this repo.

---

## What the demo shows

| Journey | Example message | What happens |
|---|---|---|
| **Household move** | “I want to move my apartment from DHA to Clifton” · “ghar shift karna hai DHA se Clifton” | Detects house shifting and an intra-city Karachi move (DHA is resolved to Karachi because Clifton is there). Asks **only** for what’s missing (home size, floor and lift, move date, packing, AC removal/refit, special items) using quick-reply chips, a date picker and multi-select. Captures the phone number with a mock OTP, then shows a request card **#MV-XXXX** and the structured JSON. |
| **Business / fleet** | “We run 20 Suzuki pickups daily for deliveries across the city” | Detects a B2B fleet lead (20 × Suzuki pickup, deliveries, city-wide). Qualifies company name, city/zones, daily trips, operating hours, main pain point (cost / reliability / tracking) and contact. Outputs an **Enterprise lead** with a **high / medium / low priority and the reason in plain text**, plus JSON; an account manager will follow up and onboard them to the Enterprise portal. |
| **Info** | “Tell me about Rawana” · “Do you operate in Multan?” · “Which vehicles do you have?” | Answers with rich cards (services, fleet, cities, how booking works, Enterprise) from a local knowledge file, then always offers buttons back into booking. |

Also:

- **English and Roman Urdu** in, replies in the same style (“Zaroor! Karachi ke andar shifting, DHA se Clifton…”). Understands Pakistani phrasing such as *kal*, *parson*, *agle hafte*, *teen kamre*, *doosri manzil*, *lift nahi*, *10 marla*, *1 kanal*, about 90 named neighbourhoods across the 8 service cities, plus Islamabad sectors (*F-7*, *G-11/2*).
- **Mic button** using the browser’s Web Speech API (Chrome, Edge, Safari). It hides itself where unsupported.
- **“Understood” pills** under each reply show exactly what the AI extracted, which makes the flow easy to follow during a pitch.
- **Mid-flow questions** (“do you also do AC fitting?”) get an answer card, then the conversation returns to the booking.
- **Ops dashboard** tab: every request created in this browser session (ID, type, summary, priority, time), with a detail drawer showing the full JSON (copy / download / export all). This proves the hand-off to operations.
- Works at phone width.

## 60-second demo script

| Time | Do | Say |
|---|---|---|
| 0:00 | Open the site. | “No forms. Customers just say what they need, typed or spoken, in English or Roman Urdu.” |
| 0:08 | Tap **Roman Urdu** (“ghar shift karna hai DHA se Clifton”). | “It understood a house shift inside Karachi from one line. It only asks for what’s missing.” |
| 0:15 | Tap **3 bedrooms → 2nd floor → Nahi, sirf seerhiyan → Is weekend → Haan, sab pack karein → 2 ACs → Fridge → Done** (chips follow the customer’s language; in English they read *No lift, stairs only*, *This weekend*, *Yes, pack everything*). | “Taps instead of typing. A date picker, not a form.” |
| 0:28 | Type `0300 1234567`, **Send code**, then **Autofill demo code**. | “Verified. The ops team gets request #MV-…, with the suggested vehicle and crew, a priority, and clean JSON.” |
| 0:35 | **New chat** → tap **Run a delivery fleet**. Answer: company name, **Karachi**, **50–100**, **24/7**, **Tracking & visibility**, then `Ayesha Khan, 0321 7654321`. | “Businesses get qualified automatically. Here’s a high-priority Enterprise lead and *why* it’s high.” |
| 0:50 | **New chat** → type “Do you operate in Multan?” | “Questions get rich answers, and every answer leads back to booking.” |
| 0:55 | Open **Ops dashboard**, click a row. | “This is exactly what lands with your operations team.” |

Optional encore: open **AI settings**, connect a Gemini key, and repeat any journey with free-form text to show live AI.

## Two AI modes

### Demo mode (default, no key)

A deterministic rule and slot-filling engine that runs entirely in the browser. No network calls, no key, the same result every time, so it is safe for a live pitch.

- **Router** scores the three journeys from keyword and pattern signals (`src/lib/router.ts`).
- **Extraction** pulls areas, cities, home size, floor/lift, dates, packing, AC count, special items, vehicle types, fleet size, trips per day, hours, pain points, company and contact details with regex and keyword matching (`src/lib/extract.ts`, `src/lib/nlp.ts`, `src/lib/gazetteer.ts`).
- **Slots** define the required fields per journey, the order they are asked in, and the chips or widget each question uses (`src/lib/slots.ts`).
- Short replies are read in context: “2” after the floor question means 2nd floor, after the AC question it means 2 ACs.

### Live mode (Google Gemini, free tier)

1. Open **AI settings** (top right) and paste a Gemini API key. You can create one for free at <https://aistudio.google.com/apikey>.
2. **Connect** checks the key by listing the models it can use, and picks a stable **Flash-Lite** model by default (fastest, with the most generous free daily quota). You can switch to a Flash model in the dropdown.
3. Every chat turn calls `models/{model}:generateContent` straight from the browser with:
   - a system instruction containing the company facts (from the same local knowledge file), today’s date, the field definitions for each journey and the current collected state;
   - the recent conversation;
   - `responseMimeType: application/json` and a `responseJsonSchema`, so Gemini must answer with
     `{ journey, language, collected_fields, missing_fields, reply, quick_replies, info_topics }`.
4. The app **validates every value** (enums, number ranges, no past dates), merges it into its own state, and picks the right widget for the next question (date picker, multi-select, phone, OTP).
5. Phone verification, contact capture, lead scoring and the final record stay deterministic in the browser. **Phone numbers and contact details are never sent to the model.**
6. **Fallback:** any error (network, timeout, rate limit or quota, malformed output) answers that turn with the demo engine and shows a small notice. A rejected key switches the app back to demo mode.

**Key handling:** the key is held only in React state for the open tab. It is never written to localStorage, cookies, the URL or the repo, and it is sent only to Google in the `x-goog-api-key` header. Refreshing the page clears it.

**Free-tier notes:** Google may use free-tier prompts to improve its models, so use demo data only. Free quotas are small for Flash models and larger for Flash-Lite. In production the key would sit behind a small backend proxy rather than in the browser.

## Run locally

Requires Node.js 20.19+ or 22+.

```bash
npm install
npm run dev        # http://localhost:5173/Client-Pitch-Logistics/
npm test           # engine unit tests (journeys, Roman Urdu, dates, live-mode guards)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main` (and the demo branch): install → test → build, then publishes the site in both ways GitHub Pages supports, so it works whichever **Settings → Pages → Source** is selected:

- **Deploy from a branch** → choose `gh-pages` / `(root)`. The workflow pushes the built site to that branch.
- **GitHub Actions** → the workflow’s `deploy` job publishes it with `actions/deploy-pages`.

The Vite `base` is `/Client-Pitch-Logistics/` (see `vite.config.ts`). Change it if the repository is renamed. The URL path is case-sensitive.

## Project structure

```
src/
  App.tsx                 layout, tabs, turn orchestration, live → demo fallback
  brand.ts                placeholder brand name and ?brand= override
  components/             Landing, Composer (mic), ChatThread, Widgets, Cards, OpsDashboard, SettingsPanel
  hooks/useSpeech.ts      Web Speech API wrapper
  lib/
    knowledge.ts          services, fleet, cities, booking steps, Enterprise features
    gazetteer.ts          neighbourhoods per city, Islamabad sectors, ambiguity handling
    nlp.ts                normalisation, Roman Urdu detection, dates, numbers, phone/email
    router.ts             intent scoring and info topics
    extract.ts            slot extraction and context-aware answer parsing
    slots.ts              required fields, order, prompts, chips, widgets
    engine.ts             demo engine: journeys, OTP, contact capture, completion
    live.ts               Gemini turn: prompt, JSON schema, validation, merge
    gemini.ts             minimal REST client for the Gemini API
    records.ts            request / lead payloads, vehicle and crew suggestion, priority scoring
    store.ts              session request store for the ops dashboard
  test/engine.test.ts
```

## Scope and limits

- There is no backend. Requests live in this tab’s `sessionStorage` and disappear when it closes.
- The OTP is simulated: the code is shown on screen as a demo SMS and nothing is sent.
- Quotes and prices are intentionally not generated. The ops team confirms them after the hand-off.
