# Society Treasury

Society Treasury is a shared record book for student societies. Members sign in with an email address, get a membership pass, and see where every euro goes. Spending only happens after a vote, and students vote alongside the committee. Every pass, vote and receipt is written to a NEAR smart contract, so nobody can quietly change the books later.

**Live app:** [web-production-b3f76b45.up.railway.app](https://web-production-b3f76b45.up.railway.app)

**NEAR Hackathon 2026 · Track: Social Money** (shared budgets, reputation-based access)

## Why we built it

A typical student society runs on membership fees and event money, kept by one treasurer, often in a personal account. Members can't see the spending, receipts go missing, and when the committee changes each year the records usually go with the old one.

We wanted three things that a spreadsheet can't give:
- **Nobody spends alone.** Every request needs approval from other people, whatever the amount.
- **Members have a say.** Students who paid their fee get a vote, not just a view.
- **Anyone can check.** The record lives somewhere no single person controls.

Money itself stays off-chain: students pay by cash, card or bank transfer as they do today. NEAR holds the record, not the funds.

## What's on NEAR

One contract, [`society-treasury.testnet`](https://testnet.nearblocks.io/address/society-treasury.testnet), keeps the society's rules and history:

1. **Membership passes.** A numbered, non-transferable NFT is minted when the treasurer confirms a student's fee. It follows the NEP-171 view methods so wallets and explorers can show it, and `nft_transfer` always refuses.
2. **Spending votes.** Each request is stored with every committee vote and every student vote. The contract decides the outcome itself, using the same rule as the app.
3. **Receipts.** When a request is paid, the SHA-256 fingerprint of the receipt file is stored with it. Anyone holding the file can check that it's the one that was approved.
4. **Roles and handover.** President, treasurer and committee roles live on the contract, so a new committee inherits the full history.

Members never sign a transaction or pay gas. Each record is written by the society's contract account **on behalf of** the member who acted, and the contract checks that member's role before accepting it.

## Check it yourself in a minute

You only need Node 18 or newer. There are no keys, wallets or installs.

```sh
node scripts/check-chain.mjs
```

The script reads the live testnet contract directly over RPC:

```
Society Treasury on NEAR testnet: society-treasury.testnet
  Computing Society (COMPSOC), term 2026/27
  rules: pass with more than 70% of votes, at least 2 yes; student vote counts after 3 students vote
  7 passes, 3 spending requests, €100.00 marked spent
Committee roles
  president  89c60e…0cb2
  treasurer  5b9270…99bd
  ...
Membership passes (non-transferable NFTs)
  #0001  89c60e…0cb2  2026/27  fee €0.00 by waived
  #0002  fbc659…4467  2026/27  fee €15.00 by bank
  ...
Spending requests
  REQ-0002  Snacks: €100.00, spent, 2 yes / 0 no, receipt sha256 4a17cb674adf…
  ...
Access keys on the contract account
  function call only: issue_pass, set_role, handover, update_settings, create_request, vote, mark_spent, add_president, student_vote, set_student_quorum
  full access (the owner’s key, which is not on the server)
```

In the app, the **On NEAR** page lists the same records. Each one links to its transaction on NearBlocks.

## Deployment

| | Where |
|---|---|
| App and API | [web-production-b3f76b45.up.railway.app](https://web-production-b3f76b45.up.railway.app) (Railway) |
| Contract | [`society-treasury.testnet`](https://testnet.nearblocks.io/address/society-treasury.testnet) |
| Health check | [`/api/health`](https://web-production-b3f76b45.up.railway.app/api/health): database status, plus NEAR jobs pending and failed |

## How it works

```
 Member (email sign-in, Privy) ──► Next.js API on Railway ──► Postgres: the record + a chain job, in one transaction
                                                                   │
                                        chain worker (oldest job first, retried) ──► society-treasury.testnet
                                        signs with a function-call key,              on_behalf_of = the member
                                        so the society pays the gas
```

### A member's journey

1. **Sign in** with an email code. Privy creates a NEAR wallet in the background. There's no seed phrase or browser extension.
2. **Send proof of the fee:** a photo or PDF of the payment. The student sees that it's under review.
3. **Get a pass.** The treasurer confirms the payment, and pass #000N is minted to the student's NEAR account.
4. **Request money.** A committee member opens a request, such as "€30 pizza for new students".
5. **Vote.** The committee votes, and so do the students. Once enough students have voted, their majority counts as one committee vote.
6. **Spend and prove it.** The treasurer pays, uploads the receipt, and the request becomes Spent. The receipt's fingerprint goes on-chain.

### The voting rule

The same rule runs in [`src/lib/rules.ts`](src/lib/rules.ts) and in the contract:

- **Seats:** every committee member except the person asking, plus **one seat for the students**. The student seat counts only once the society has at least as many students as the quorum (3 by default).
- **Yes votes needed:** more than the society's approval share of the seats (set by the president, 50 to 90%), and never fewer than 2.
- **The student seat** votes with the students' majority once enough of them have voted. A tie doesn't count.
- **Approved** when the yes votes reach that number. **Rejected** as soon as approval is no longer possible.
- A request can only be opened when at least 2 seats can vote, so no one can approve spending alone.

### Gas sponsorship and the chain outbox

- The API saves each action and a `chain_jobs` row in the same database transaction, so a record never exists without its NEAR job.
- A worker sends jobs strictly in order, so a vote never reaches the chain before its request. It runs right after each response, and every 30 seconds as a backstop.
- Network errors are retried (up to 8 tries) without skipping ahead. If the contract rejects a call, the job is marked failed and shown as "Not recorded on NEAR".
- A Postgres advisory lock lets only one server send at a time, even while a deploy swaps containers.
- The server holds a **function-call key** that can call only the ten record-keeping methods listed above. It can't move funds, add keys or redeploy the contract.
- The contract accepts `on_behalf_of` only from its own account, then checks that member's role as if they'd signed. Every change also logs an `EVENT_JSON` line, so indexers can read it.

### Roles

| Role | Can do |
|---|---|
| President | Assign the treasurer and committee, set the approval share and student quorum, hand over to the next president, create requests and vote |
| Treasurer | Review fee proofs and issue passes, upload receipts and mark requests Spent, create requests and vote |
| Committee | Create spending requests and vote |
| Student | See their pass and every request, vote and receipt; vote in the student vote; check in at events |

Nobody can vote on their own request, and there are no routes to edit or delete votes, receipts or the activity log.

## Run it locally

### Against the live backend (no setup)

This is the fastest way to work on the frontend. Clone the repo, then:

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) and sign in with your email. Without a `.env.local`, the dev server forwards every `/api` call to the deployed app (set `REMOTE_API_URL` to use another backend). Everything you do is real: it goes into the shared database and onto NEAR testnet.

### With your own database

```sh
npm install
cp .env.example .env.local   # fill in the values below
npm run db:migrate
npm run dev
```

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET` | Privy app with email login enabled |
| `DATABASE_URL` | Postgres connection string |
| `BOOTSTRAP_PRESIDENT_EMAIL` | Comma-separated emails that become president when they sign up |
| `SOCIETY_NAME`, `SOCIETY_SHORT_NAME`, `SOCIETY_TERM` | The society shown in the app |
| `NEAR_NETWORK`, `NEAR_CONTRACT_ID`, `NEXT_PUBLIC_NEAR_CONTRACT_ID`, `NEAR_RPC_URL` | Which network and contract to use |
| `NEAR_RECORDER_PRIVATE_KEY` | The function-call key that pays gas. Leave it empty and nothing is sent to NEAR |

`.env.local` is git-ignored, so real keys never get committed.

After changing the schema in `src/server/db/schema.ts`, run `npm run db:generate` to write a migration, then `npm run db:migrate`.

## Build and test the contract

You need Rust (the toolchain is pinned in `contract/rust-toolchain.toml`) and [cargo-near](https://github.com/near/cargo-near).

```sh
cd contract
cargo test                                         # 25 unit tests
cargo near build non-reproducible-wasm --no-abi
```

Method signatures, deploy steps and the state migration are in [`contract/README.md`](contract/README.md).

## Deploying

The infrastructure is defined in [`.railway/railway.ts`](.railway/railway.ts): a `web` service for this app and a Postgres database. Each deploy runs `npm run db:migrate` first and waits for `/api/health`.

```sh
railway up --service web
```

Variables live in Railway, not in the repo. Add the app's public URL to the Privy app's allowed origins.

## Project layout

```
contract/            Rust contract (near-sdk 5) and its tests
drizzle/             SQL migrations
scripts/             migrate.mjs (runs on deploy), check-chain.mjs (reads the live contract)
src/app/(app)/       Signed-in pages: home, spending, members, committee, settings, On NEAR
src/app/api/         API routes: sign-up, fee proofs, members, requests, votes, student votes, receipts, events
src/server/          Database, Privy token checks, permissions, NEAR calls and the chain worker
src/lib/rules.ts     The voting rule, shared with the contract
src/views/           Page content
src/components/      App shell, membership pass, chain chips, shared UI
```

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Motion, SWR, Drizzle ORM, Postgres, Privy (email login and NEAR embedded wallets), near-api-js, Rust with near-sdk, Railway.

## Built during the hackathon

Everything in this repo was written during NEAR Hackathon 2026 (first commit on 10 November 2026): the app, the API and database, the contract and its tests, the gas-sponsored chain worker, and the scripts.

## Team

Built by Susan Ogozi (BSc Computing Science) and team, in the Department of Computer Science at Griffith College Dublin.
