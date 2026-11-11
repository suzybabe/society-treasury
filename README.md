# Society Treasury

**Transparent membership passes, committee voting and spending records for student societies, built on NEAR.**

Built for the **NEAR HACKATHON 2026** · Track: **Social Money**

---

## The problem

Student societies (tech societies, cultural societies, sports clubs) handle real money: membership fees, event tickets and sponsorship. In most societies:

- One treasurer controls all the money, often through a personal bank account or cash.
- Members can't see where their money goes.
- Receipts get lost and reimbursements are slow.
- When a new committee is elected each year, the handover is messy and records disappear.

## The solution

Society Treasury is a transparent record-keeping and voting app for student societies.

- **Money stays off-chain.** Students pay their fee the normal way (cash, card or bank transfer). No crypto payments are needed.
- **Records live on NEAR.** Memberships, votes and spending records are stored on the NEAR blockchain, so they can't be edited, deleted or faked.
- **Spending needs approval.** Every expense must be voted on by the committee before money is spent.
- **Everything is visible.** Every member can see every request, every vote and every receipt.
- **No wallet setup.** Students sign in with their email, and an embedded wallet is created for them automatically. No seed phrases, no crypto knowledge needed.

**In one line:** treasurers issue digital membership passes when students pay their fees, committees vote on every expense, and every approved spend is logged with its receipt, so members can trust where their money goes.

---

## How it works

1. **Setup:** the society president creates the society in the app and adds committee members.
2. **Join:** a student pays the membership fee normally (cash, card or bank transfer).
3. **Issue pass:** the treasurer confirms the payment in the app, and the student receives a **membership NFT pass**.
4. **Request:** a committee member creates a spending request, for example "€40 pizza for Hack Night".
5. **Vote:** the committee votes. Small amounts under a set limit (for example €20) are auto-approved.
6. **Spend:** if approved, the treasurer pays from the society's normal bank account.
7. **Proof:** the treasurer uploads the receipt and marks the request as **Spent**.
8. **Transparency:** every step is recorded on NEAR and visible to all members.

### Request statuses

| Status | Meaning |
|---|---|
| Pending | Waiting for committee votes |
| Approved – awaiting receipt | Approved, but the receipt is not uploaded yet |
| Spent | Paid, with the receipt uploaded |
| Rejected | Voted down by the committee |

---

## Roles and permissions

### President (admin)
- Add or remove committee members
- Set the rules: votes needed and the auto-approve limit
- Hand over control to the next committee
- Create spending requests and vote

### Treasurer
- Confirm student fee payments and issue membership passes
- Upload receipts and mark requests as Spent
- Create spending requests and vote

### Committee members (Secretary, Events Officer, etc.)
- Create spending requests
- Vote on requests

### Students (members)
- Can view their membership pass
- Can view all spending requests, votes and receipts
- Can view totals: collected, spent and balance
- Can check in at events with their pass
- Cannot create requests, vote, issue passes or edit anything

### Rules for everyone
- Nobody can vote on their own request
- Nobody can approve spending alone
- Nobody can edit or delete past votes or records

---

## Pages

| Page | Who sees it | What it shows |
|---|---|---|
| Login | Everyone | Email sign-in (embedded wallet created automatically) |
| Member home | Members | Membership pass, plus collected / spent / balance totals |
| Spending log | Members | All requests with colour-coded statuses |
| Request detail | Members | Amount, reason, who voted, receipt photo |
| Committee dashboard | Committee | Payments to confirm, requests needing a vote, new request button |
| Settings | President | Committee list, voting rules, handover |

---

## Why NEAR?

- **Tamper-proof records:** votes and spending history can't be changed after the fact.
- **No single point of control:** no one treasurer can secretly change the records.
- **Easy handover:** the full history stays when the committee changes each year.
- **Student-friendly:** an embedded wallet and email login mean students never deal with crypto directly.

---

## Tech stack

- **Frontend:** [Next.js](https://nextjs.org/) (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Blockchain:** NEAR Protocol (testnet)
- **Smart contract:** society, membership, request and voting logic
- **Wallet:** embedded wallet with email login
- **Receipts:** images stored off-chain; only a link/reference is stored on NEAR

---

## Features

### MVP (hackathon scope)
- [x] Email login with embedded wallet
- [x] Create a society and add committee members
- [ ] Treasurer confirms payment and issues membership NFT pass
- [x] Create spending requests
- [x] Committee voting (majority, no self-voting)
- [x] Auto-approve under a spending limit
- [x] Upload receipt and mark as Spent
- [x] Public spending log and totals

### Future ideas
- [ ] Separate budgets per event
- [ ] One-click committee handover
- [ ] Event check-in by scanning the membership pass
- [ ] Optional neutral referee (e.g. Students' Union) for disputes
- [ ] Support for multiple societies per college

---

## Getting started

### Prerequisites
- Node.js 22.18 or newer
- npm
- Git
- A [Privy](https://dashboard.privy.io) app with **email** login enabled
- A Postgres database (we use Railway's)

### Run locally

```bash
git clone https://github.com/suzybabe/society-treasury.git
cd society-treasury
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run db:migrate           # creates the tables
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID (Privy dashboard → Settings → Basics) |
| `NEXT_PUBLIC_PRIVY_CLIENT_ID` | Optional Privy app client ID |
| `PRIVY_APP_SECRET` | Privy app secret. Server-side only, keep it secret |
| `DATABASE_URL` | Postgres connection string |
| `BOOTSTRAP_PRESIDENT_EMAIL` | The first person to sign up with this email becomes president |

`.env.local` is git-ignored. Never commit real keys.

### How sign-in works

1. A student enters their email and the 6-digit code Privy sends them. The same flow signs up new users.
2. The app creates a **NEAR embedded wallet** for them through Privy (an implicit NEAR account), then registers them with the API.
3. They enter their name, then wait for the treasurer to confirm they've paid. The page opens the treasury automatically once their pass is issued.
4. The person whose email matches `BOOTSTRAP_PRESIDENT_EMAIL` skips the wait and becomes president. They then assign the treasurer and committee in Settings.

### Database

The schema lives in `src/server/db/schema.ts` (Drizzle ORM). After changing it:

```bash
npm run db:generate   # writes a new SQL migration to ./drizzle
npm run db:migrate    # applies it
```

Records are append-only: there are no API routes to edit or delete requests, votes, receipts or the activity log.

### Deploying to Railway

Infrastructure is defined in `.railway/railway.ts`: a `web` service (this Next.js app) and a `Postgres` database. Variables are managed in Railway, not in that file.

```bash
railway link                     # pick the society-treasury project
railway config plan              # preview changes
railway config apply             # create/update services
railway variables --service web --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set NEXT_PUBLIC_PRIVY_APP_ID=... --set PRIVY_APP_SECRET=... --set BOOTSTRAP_PRESIDENT_EMAIL=...
railway up --service web         # deploy (or connect the GitHub repo in the dashboard)
railway domain --service web     # get a public URL
```

Each deploy runs `npm run db:migrate` first and checks `/api/health`. Add the public URL to your Privy app's **allowed origins**.

> On Windows with an npm-installed Railway CLI, `railway config plan/apply` may fail with "requires Railway CLI 5.42.1 or newer". Run it from PowerShell with `$env:_ = "C:\Program Files\nodejs\node_modules\@railway\cli\bin\railway.exe"` set first.

---

## Project structure

```
society-treasury/
├── .railway/            # Railway infrastructure (railway.ts)
├── drizzle/             # SQL migrations
├── public/              # Static files (icons, images)
├── scripts/migrate.mjs  # Applies migrations (run before each deploy)
├── src/
│   ├── app/             # Next.js routes (App Router)
│   │   ├── api/         # Backend API: auth, members, requests, votes, receipts, events
│   │   ├── login/       # Email sign-in and sign-up
│   │   └── (app)/       # Signed-in pages: home, spending, spending/[id], committee, settings
│   ├── server/          # Server-only code: database, Privy verification, permissions
│   ├── views/           # Page content for each route
│   ├── components/      # App shell, membership pass, theme toggle, shared UI
│   ├── state/           # Session (Privy + NEAR wallet) and data store (API)
│   └── lib/             # Shared types, voting rules, formatting
├── package.json
├── tsconfig.json
└── README.md
```

---

## Hackathon

- **Event:** NEAR HACKATHON 2026
- **Track:** Social Money (shared budgets, programmable rewards, reputation-based access)
- **Builder:** Susan Ogozi, BSc Computing Science, Griffith College Dublin