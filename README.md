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
- [ ] Email login with embedded wallet
- [ ] Create a society and add committee members
- [ ] Treasurer confirms payment and issues membership NFT pass
- [ ] Create spending requests
- [ ] Committee voting (majority, no self-voting)
- [ ] Auto-approve under a spending limit
- [ ] Upload receipt and mark as Spent
- [ ] Public spending log and totals

### Future ideas
- [ ] Separate budgets per event
- [ ] One-click committee handover
- [ ] Event check-in by scanning the membership pass
- [ ] Optional neutral referee (e.g. Students' Union) for disputes
- [ ] Support for multiple societies per college

---

## Getting started

### Prerequisites
- Node.js (LTS)
- npm
- Git

### Run locally

```bash
git clone https://github.com/suzybabe/society-treasury.git
cd society-treasury
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
society-treasury/
├── public/            # Static files (icons, images)
├── src/
│   └── app/           # Next.js pages (App Router)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Hackathon

- **Event:** NEAR HACKATHON 2026
- **Track:** Social Money (shared budgets, programmable rewards, reputation-based access)
- **Builder:** Susan Ogozi, BSc Computing Science, Griffith College Dublin