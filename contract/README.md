# Society Treasury contract

The on-chain record for a student society: membership passes, committee roles, voting rules, and every spending request with its votes and receipt hash.

**Deployed on testnet:** [`society-treasury.testnet`](https://testnet.nearblocks.io/address/society-treasury.testnet)

## What it enforces

- Only committee members (president, treasurer, committee) can create requests or vote.
- Nobody votes on their own request, and each member votes once. Votes can't be changed.
- A request passes with more than `approval_percent` of eligible votes, and never with fewer than 2 approvals.
- Requests under `auto_approve_limit_cents` are approved immediately.
- Only the treasurer marks a request Spent, only after it's approved, and only with a SHA-256 receipt hash.
- Only the treasurer issues passes (or the president, while there's no treasurer). One pass per account.
- Passes can't be transferred. Records can't be edited or deleted.

Members can call the contract with their own NEAR account. The contract account itself can also record an action **on behalf of** a member (`on_behalf_of`), so the app's backend can write records without students paying gas. The rules are checked against that member either way.

## Methods

| Method | Who | What it does |
|---|---|---|
| `new(society, settings, president)` | contract account (once) | Sets up the society and issues pass #1 to the president |
| `issue_pass(member, fee_method, fee_cents)` | treasurer | Mints a membership pass (NFT) |
| `set_role(account_id, role)` | president | Gives or removes a committee role. One treasurer at a time |
| `handover(new_president, new_term)` | president | Hands the presidency to the next committee |
| `update_settings(settings)` | president | Changes the voting rules and fee |
| `create_request(app_ref, title, category, amount_cents)` | committee | Asks to spend money |
| `vote(request_id, approve)` | committee | Votes on a request |
| `mark_spent(request_id, receipt_sha256)` | treasurer | Records the receipt hash and marks it Spent |

Every change method also takes an optional `on_behalf_of`.

Views: `get_society`, `get_settings`, `get_roles`, `get_pass`, `get_passes`, `get_request`, `get_requests`, `get_stats`, plus the NEP-171 views `nft_metadata`, `nft_token`, `nft_tokens`, `nft_tokens_for_owner`, `nft_total_supply` and `nft_supply_for_owner`. Changes emit `EVENT_JSON` logs (`nep171` `nft_mint` for passes, `society_treasury` for everything else).

## Build and test

Needs [Rust](https://rustup.rs) and [cargo-near](https://github.com/near/cargo-near).

```bash
cargo test                                      # unit tests
cargo near build non-reproducible-wasm --no-abi # writes target/near/society_treasury.wasm
```

On Windows, set `AWS_LC_SYS_PREBUILT_NASM=1` before `cargo test` (a test dependency otherwise needs the NASM assembler). `--no-abi` skips ABI generation, which fails to link on Windows. Neither affects the deployed contract.

For a reproducible build (same binary on any machine), use `cargo near build reproducible-wasm` with Docker.

## Deploy

With [near CLI](https://github.com/near/near-cli-rs):

```bash
near contract deploy society-treasury.testnet use-file target/near/society_treasury.wasm \
  with-init-call new json-args '{"society":{"name":"Computing Society","short_name":"COMPSOC","term":"2026/27"},"settings":{"approval_percent":50,"auto_approve_limit_cents":2000,"membership_fee_cents":1500},"president":"<president NEAR account>"}' \
  prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send
```

To redeploy new code without resetting state, deploy with `without-init-call` instead.

Read state:

```bash
near contract call-function as-read-only society-treasury.testnet get_roles json-args '{}' network-config testnet now
```
