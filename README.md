# Hall of Fantasy

A permanent Hall of Fame for ESPN Fantasy Basketball leagues. A commissioner connects their league, imports its history into MongoDB, and gets a league code (e.g. `HOF-7X92KQ`) to share. Members enter the code to browse the Hall — no ESPN account needed.

```
ESPN ──► server-side importer ──► MongoDB ──► Hall data layer / API ──► Next.js UI
```

Visitors never trigger ESPN requests; the Hall reads MongoDB only.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · MongoDB (Atlas) · Vercel

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string (include the database name in the path). |
| `MONGODB_DB` | No | Overrides the database name from the URI. |
| `ESPN_CREDENTIALS_KEY` | For private leagues | 32 random bytes (base64 or hex) used to encrypt `espn_s2`/`SWID` while an import runs. Generate with `openssl rand -base64 32`. Public leagues work without it. |

All are server-only. Copy `.env.example` to `.env.local` for local development. `.env*` files are git-ignored.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI (and ESPN_CREDENTIALS_KEY)
npm run dev                  # http://localhost:3000
```

`npm run build && npm start` for a production build. Indexes are created automatically on first use.

## Deploy to Vercel

**1. MongoDB Atlas** (free tier works)
1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. *Database Access* → add a database user with a password.
3. *Network Access* → add `0.0.0.0/0` (Vercel functions don't have fixed IPs unless you pay for static IPs).
4. *Connect* → *Drivers* → copy the connection string and put a database name in the path:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/halloffantasy?retryWrites=true&w=majority`

   (Alternatively, add the **MongoDB Atlas integration** from the Vercel Marketplace, which creates `MONGODB_URI` for you.)

**2. Vercel**
1. [vercel.com/new](https://vercel.com/new) → import this GitHub repository. Framework preset: **Next.js** (auto-detected). No build settings to change.
2. *Environment Variables* (Production, Preview and Development):
   - `MONGODB_URI` — the Atlas string from above
   - `ESPN_CREDENTIALS_KEY` — output of `openssl rand -base64 32` (needed for private leagues)
3. **Deploy.** Collections and indexes are created automatically on the first request.

Notes:
- The build needs no environment variables or network access to MongoDB/ESPN; they are only used at request time.
- Import endpoints set `maxDuration = 60` and each request does at most ~20 seconds of work, so imports fit the Hobby plan.
- MongoDB connections are reused across requests and registered with `attachDatabasePool` (`@vercel/functions`) so they close cleanly when a function instance is suspended.
- If you change an environment variable later, redeploy for it to take effect.

## Connecting your ESPN league

1. Open your league at fantasy.espn.com — the URL contains `leagueId=12345678`.
2. In the app: **Create Your Hall** → enter the League ID and the most recent season (ESPN names seasons by the year they end: 2025–26 = **2026**). If that season doesn't exist yet, the app automatically tries the previous one.
3. **Public league:** leave "My league is private" unchecked.
4. **Private league:** check it, then paste `espn_s2` and `SWID`:
   - On a computer, sign in to fantasy.espn.com.
   - Developer tools → *Application* (Chrome/Edge) or *Storage* (Firefox/Safari) → *Cookies* → `https://fantasy.espn.com`.
   - Copy the `espn_s2` value exactly as shown (it usually contains `%2B`/`%2F` — keep them) and the `SWID` value (with or without `{ }`).
   - The account must be a member of the league.

**Setup check:** open `https://YOUR-SITE.vercel.app/api/health`. It reports whether the database connects, whether `ESPN_CREDENTIALS_KEY` is valid, and whether ESPN is reachable from the server (status only, never secret values).

| Message | Meaning / fix |
| --- | --- |
| "Couldn't connect to the database…" | Atlas → Network Access → add `0.0.0.0/0`. |
| "Database login failed…" | Wrong username/password in `MONGODB_URI`; fix it in Vercel and redeploy. |
| "MONGODB_URI is not set" / "isn't a valid MongoDB connection string" | Add or re-copy `MONGODB_URI` in Vercel and redeploy. |
| "This league is private…" | Check "My league is private" and add `espn_s2` + `SWID`. |
| "ESPN rejected the provided credentials…" | Pick the previous season (your league may not have renewed yet); recopy `espn_s2` with Chrome's "Show URL-decoded" **unchecked**; make sure the ESPN account is in the league; copy fresh cookies if they expired. |
| "ESPN blocked the request from this server…" | ESPN's bot protection refused the server; try again later. |
| "League or season not found on ESPN." | Check the League ID and season. |
| "Private leagues are not enabled on this server…" | Set `ESPN_CREDENTIALS_KEY` in Vercel and redeploy. |
| "ESPN is temporarily unavailable…" | ESPN hiccup — press **Resume Import**; finished seasons are kept. |

## How it works

### Commissioner
1. **Create Hall** — intro.
2. **Connect ESPN League** — League ID + most recent season; for private leagues, `espn_s2` and `SWID`. The server finds the league and lists its seasons (`status.previousSeasons`).
3. **Import History** — choose seasons; the browser drives the import one slice at a time and shows progress per season. If a request fails, completed seasons stay saved and **Resume Import** continues from the failed step.
4. **Hall Created** — league code with Copy Code / View Hall.

### Members
`/join` → enter code (case/spacing-insensitive) → server validates → `/hall/HOF-XXXXXX`. Invalid codes show “League not found. Check your code and try again.”

## ESPN integration

Uses ESPN's unofficial Fantasy v3 API (`lm-api-reads.fantasy.espn.com/apis/v3/games/fba`), the same endpoints used by the widely used `espn-api` library:

| Data | Endpoint / view |
| --- | --- |
| League, teams, managers, standings, matchups, playoffs | `seasons/{year}/segments/0/leagues/{id}?view=mTeam&view=mSettings&view=mStatus&view=mMatchupScore&view=mStandings` |
| Seasons before 2018 | `leagueHistory/{id}?seasonId={year}` |

The app tracks team and manager results only — records, wins/losses, points for and against, standings, matchups, playoffs and championships. No player data, drafts, rosters or transactions are imported. One ESPN request per season.

**Authentication.** Private leagues require the `espn_s2` and `SWID` cookies. They are POSTed once over HTTPS to `/api/import/connect`. The server encrypts them (AES-256-GCM, `ESPN_CREDENTIALS_KEY`), stores them in `import_credentials` with a 6-hour TTL, and deletes them as soon as the import finishes. They are never returned in responses, put in URLs, logged, or stored in the browser. The form clears them after submit. ESPN usernames/passwords are never requested.

Requests retry on network errors, 429, and 5xx responses (3 attempts, exponential backoff).

## MongoDB collections

`leagues`, `seasons`, `teams`, `members`, `matchups`, `playoffs`, `hall_records` (computed Hall of Fame / champions / records), `imports` (job state, 7-day TTL), `import_credentials` (encrypted, 6-hour TTL).

Unique indexes prevent duplicates, and every write is an upsert keyed on them:
`leagueId+season`, `leagueId+season+teamId`, `leagueId+season+memberId`, `leagueId+season+matchupId` (matchups, playoffs), `code` (leagues).

Re-importing a league updates its data in place and keeps the same league code.

## Calculations

- **Champion / runner-up**: ESPN's final ranking (`rankCalculatedFinal`); falls back to the winners-bracket final.
- **Playoff appearance**: regular-season seed ≤ league playoff team count (or appearing in the winners bracket).
- **Career stats, Hall of Fame Score, and records** use completed seasons only. Points stats use points-scoring seasons only.
- **Hall of Fame Score** (shown on the Hall of Fame page): per completed season, best result — Championship 10, Runner-up 6, other playoff appearance 3 — plus 2 for the #1 regular-season seed.
- Managers are identified across seasons by their ESPN member ID.

## API

| Route | Purpose |
| --- | --- |
| `POST /api/import/connect` | Discover league, create import job |
| `POST /api/import/start` | Choose seasons |
| `POST /api/import/step` | Run the next import slice |
| `GET /api/hall/[leagueCode]` | Hall summary |
| `GET /api/hall/[leagueCode]/seasons[?season=YYYY]` | Season list / season detail |
| `GET /api/hall/[leagueCode]/champions` | Championship history |
| `GET /api/hall/[leagueCode]/records` | League records |
| `GET /api/hall/[leagueCode]/managers/[managerId]` | Manager history |

The pages read the same data layer (`src/lib/hall/queries.ts`) directly as server components.

## Design & motion

Light, low-color theme (warm neutrals, one brass accent for championships). Material/Flutter-style motion built with CSS in Next.js:

- **League intro** — entering a Hall shows the league name rising in letter by letter, then the overlay lifts away (once per browser session; tap to skip).
- **Page transitions** — "fade through" on every Hall section change (`template.tsx`), "shared axis" slide between wizard steps.
- **Staggered entrances**, count-up stat numbers, ink ripples and press feedback on tappable surfaces, shimmer skeleton while loading, animated nav indicator.
- All motion is disabled for users with *Reduce Motion* enabled.

## Known ESPN limitations

- The ESPN v3 API is unofficial and undocumented; ESPN can change it without notice.
- Pre-2018 seasons (`leagueHistory`) may be missing playoff tier info; champions then come from ESPN's final ranking.
- Category leagues: “wins” are ESPN's official standings record, which counts categories in head-to-head each-category leagues.
