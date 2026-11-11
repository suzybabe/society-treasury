//! Society Treasury contract.
//!
//! Stores a student society's membership passes (non-transferable NFTs), its
//! committee roles, voting rules, and every spending request with its votes
//! and receipt hash. The rules from the app are enforced here too:
//!
//! - only committee members (president, treasurer, committee) can request or vote
//! - nobody votes on their own request, and each member votes once
//! - spending needs a committee majority, and never fewer than 2 approvals
//! - every request goes to a committee vote, whatever the amount
//! - only the treasurer marks a request Spent, and only once it's approved
//! - records are append-only: there is no way to edit or delete them
//!
//! Members can call the contract themselves. The contract account can also
//! record actions on a member's behalf (`on_behalf_of`), so the app's backend
//! can write records without students paying gas. The rules are checked
//! against that member either way.

use near_sdk::serde_json::json;
use near_sdk::store::{IterableMap, LookupMap, Vector};
use near_sdk::{AccountId, BorshStorageKey, PanicOnDefault, env, near, require};

/// Standard name used in this contract's event logs.
const EVENT_STANDARD: &str = "society_treasury";
const EVENT_VERSION: &str = "1.0.0";

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    Roles,
    Passes,
    PassByOwner,
    Requests,
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Role {
    President,
    Treasurer,
    Committee,
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum FeeMethod {
    Cash,
    Card,
    Bank,
    Waived,
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RequestStatus {
    Voting,
    Approved,
    AutoApproved,
    Rejected,
    Spent,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Society {
    pub name: String,
    pub short_name: String,
    pub term: String,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Settings {
    /// Requests pass with more than this share of eligible votes (50 to 90).
    pub approval_percent: u8,
    /// No longer used: every request goes to a vote. Kept so stored state stays compatible.
    pub auto_approve_limit_cents: u64,
    pub membership_fee_cents: u64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Pass {
    pub number: u32,
    pub owner: AccountId,
    pub term: String,
    pub issued_at_ms: u64,
    pub issued_by: AccountId,
    pub fee_method: FeeMethod,
    pub fee_cents: u64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Vote {
    pub voter: AccountId,
    pub approve: bool,
    pub at_ms: u64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Receipt {
    /// SHA-256 of the receipt file (hex). The file itself is stored off-chain.
    pub sha256: String,
    pub uploaded_by: AccountId,
    pub at_ms: u64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct SpendRequest {
    pub id: u32,
    /// The app's reference for this request, e.g. "REQ-0007".
    pub app_ref: String,
    pub title: String,
    pub category: String,
    pub amount_cents: u64,
    pub requester: AccountId,
    pub created_at_ms: u64,
    pub status: RequestStatus,
    pub votes: Vec<Vote>,
    pub decided_at_ms: Option<u64>,
    pub receipt: Option<Receipt>,
}

/// NEP-171 / NEP-177 shapes, so wallets and explorers can show the passes.
#[near(serializers = [json])]
pub struct NftContractMetadata {
    pub spec: String,
    pub name: String,
    pub symbol: String,
    pub icon: Option<String>,
    pub base_uri: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<String>,
}

#[near(serializers = [json])]
pub struct TokenMetadata {
    pub title: Option<String>,
    pub description: Option<String>,
    pub issued_at: Option<String>,
    pub extra: Option<String>,
}

#[near(serializers = [json])]
pub struct Token {
    pub token_id: String,
    pub owner_id: AccountId,
    pub metadata: TokenMetadata,
}

#[near(serializers = [json])]
pub struct Stats {
    pub passes: u32,
    pub requests: u32,
    pub spent_cents: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Treasury {
    society: Society,
    settings: Settings,
    roles: IterableMap<AccountId, Role>,
    passes: Vector<Pass>,
    pass_by_owner: LookupMap<AccountId, u32>,
    requests: Vector<SpendRequest>,
    spent_cents: u64,
}

fn emit(event: &str, data: near_sdk::serde_json::Value) {
    let log = json!({ "standard": EVENT_STANDARD, "version": EVENT_VERSION, "event": event, "data": [data] });
    env::log_str(&format!("EVENT_JSON:{log}"));
}

fn validate_settings(s: &Settings) {
    require!((50..=90).contains(&s.approval_percent), "Approval percent must be between 50 and 90");
}

/// Yes votes needed: more than `percent` of eligible voters, never fewer than 2.
pub fn required_yes(eligible: u32, percent: u8) -> u32 {
    let need = eligible * percent as u32 / 100 + 1;
    need.max(2).min(eligible.max(2))
}

#[near]
impl Treasury {
    /// Sets up the society and issues pass #1 to the founding president.
    #[init]
    #[private]
    pub fn new(society: Society, settings: Settings, president: AccountId) -> Self {
        validate_settings(&settings);
        let mut this = Self {
            society,
            settings,
            roles: IterableMap::new(StorageKey::Roles),
            passes: Vector::new(StorageKey::Passes),
            pass_by_owner: LookupMap::new(StorageKey::PassByOwner),
            requests: Vector::new(StorageKey::Requests),
            spent_cents: 0,
        };
        this.mint_pass(president.clone(), FeeMethod::Waived, 0, env::current_account_id());
        this.roles.insert(president.clone(), Role::President);
        emit("role_changed", json!({ "account_id": president, "role": Role::President }));
        this
    }

    // ---------- Members and roles ----------

    /// Issues a membership pass once the member's fee is confirmed. Allowed for
    /// the treasurer, or the president while there's no treasurer.
    pub fn issue_pass(&mut self, member: AccountId, fee_method: FeeMethod, fee_cents: u64, on_behalf_of: Option<AccountId>) -> u32 {
        let actor = self.actor(on_behalf_of);
        let role = self.roles.get(&actor).copied();
        let allowed = role == Some(Role::Treasurer) || (role == Some(Role::President) && !self.has_role(Role::Treasurer));
        require!(allowed, "Only the treasurer can issue passes");
        require!(self.pass_by_owner.get(&member).is_none(), "This account already has a pass");
        self.mint_pass(member, fee_method, fee_cents, actor)
    }

    /// President only: give a member a committee role, or remove it with `None`.
    /// There's one treasurer at a time; the previous one stays on the committee.
    pub fn set_role(&mut self, account_id: AccountId, role: Option<Role>, on_behalf_of: Option<AccountId>) {
        let actor = self.actor(on_behalf_of);
        self.require_role(&actor, &[Role::President]);
        require!(account_id != actor, "Use handover to change the president");
        require!(role != Some(Role::President), "Use handover to change the president");
        require!(self.pass_by_owner.get(&account_id).is_some(), "Only members with a pass can hold a role");
        if role == Some(Role::Treasurer) {
            let previous: Vec<AccountId> = self.roles.iter().filter(|(_, r)| **r == Role::Treasurer).map(|(a, _)| a.clone()).collect();
            for a in previous {
                self.roles.insert(a, Role::Committee);
            }
        }
        match role {
            Some(r) => {
                self.roles.insert(account_id.clone(), r);
            }
            None => {
                self.roles.remove(&account_id);
            }
        }
        emit("role_changed", json!({ "account_id": account_id, "role": role, "by": actor }));
    }

    /// President only: hand the presidency to the next committee. All records carry over.
    pub fn handover(&mut self, new_president: AccountId, new_term: String, on_behalf_of: Option<AccountId>) {
        let actor = self.actor(on_behalf_of);
        self.require_role(&actor, &[Role::President]);
        require!(new_president != actor, "Choose someone else as the next president");
        require!(self.pass_by_owner.get(&new_president).is_some(), "The next president needs a pass");
        require!(!new_term.trim().is_empty(), "Enter the new term");
        self.roles.remove(&actor);
        self.roles.insert(new_president.clone(), Role::President);
        self.society.term = new_term.clone();
        emit("handover", json!({ "from": actor, "to": new_president, "term": new_term }));
    }

    /// President only: change the voting rules and fee.
    pub fn update_settings(&mut self, settings: Settings, on_behalf_of: Option<AccountId>) {
        let actor = self.actor(on_behalf_of);
        self.require_role(&actor, &[Role::President]);
        validate_settings(&settings);
        emit("settings_updated", json!({ "settings": settings, "by": actor }));
        self.settings = settings;
    }

    /// Contract account only (the app): appoint a co-president named by the
    /// society's founders. Issues them a pass (fee waived) if they don't have one.
    pub fn add_president(&mut self, account_id: AccountId) {
        require!(env::predecessor_account_id() == env::current_account_id(), "Only the treasury app can add presidents");
        if self.pass_by_owner.get(&account_id).is_none() {
            self.mint_pass(account_id.clone(), FeeMethod::Waived, 0, env::current_account_id());
        }
        self.roles.insert(account_id.clone(), Role::President);
        emit("role_changed", json!({ "account_id": account_id, "role": Role::President, "by": env::current_account_id() }));
    }

    // ---------- Spending ----------

    /// Committee only: ask to spend money. Every request goes to a committee vote.
    pub fn create_request(&mut self, app_ref: String, title: String, category: String, amount_cents: u64, on_behalf_of: Option<AccountId>) -> u32 {
        let actor = self.actor(on_behalf_of);
        self.require_role(&actor, &[Role::President, Role::Treasurer, Role::Committee]);
        require!(amount_cents > 0, "Amount must be more than zero");
        require!(!title.trim().is_empty() && title.len() <= 200, "Title must be 1 to 200 characters");
        require!(app_ref.len() <= 40 && category.len() <= 40, "Reference and category must be 40 characters or fewer");
        // Nobody approves alone: a request needs at least 2 people who can vote on it.
        let eligible = self.roles.keys().filter(|a| **a != actor).count();
        require!(eligible >= 2, "You need at least 3 committee members before requests can be voted on");

        let now = env::block_timestamp_ms();
        let id = self.requests.len() + 1;
        let request = SpendRequest {
            id,
            app_ref,
            title,
            category,
            amount_cents,
            requester: actor,
            created_at_ms: now,
            status: RequestStatus::Voting,
            votes: Vec::new(),
            decided_at_ms: None,
            receipt: None,
        };
        emit("request_created", json!({ "id": id, "app_ref": request.app_ref, "requester": request.requester, "amount_cents": amount_cents, "status": request.status }));
        self.requests.push(request);
        id
    }

    /// Committee only: vote on a request. Never on your own, once each, and
    /// votes can't be changed. Decides the request as soon as the outcome is certain.
    pub fn vote(&mut self, request_id: u32, approve: bool, on_behalf_of: Option<AccountId>) -> RequestStatus {
        let actor = self.actor(on_behalf_of);
        self.require_role(&actor, &[Role::President, Role::Treasurer, Role::Committee]);
        let approval_percent = self.settings.approval_percent;
        let committee: Vec<AccountId> = self.roles.keys().cloned().collect();

        let request = self.request_mut(request_id);
        require!(request.status == RequestStatus::Voting, "Voting on this request has closed");
        require!(request.requester != actor, "You can't vote on your own request");
        require!(request.votes.iter().all(|v| v.voter != actor), "You've already voted, and votes can't be changed");

        let now = env::block_timestamp_ms();
        request.votes.push(Vote { voter: actor.clone(), approve, at_ms: now });

        let eligible = committee.iter().filter(|a| **a != request.requester).count() as u32;
        let need = required_yes(eligible, approval_percent);
        let yes = request.votes.iter().filter(|v| v.approve).count() as u32;
        let no = request.votes.len() as u32 - yes;
        if yes >= need {
            request.status = RequestStatus::Approved;
        } else if no > eligible.saturating_sub(need) {
            request.status = RequestStatus::Rejected;
        }
        let status = request.status;
        if status != RequestStatus::Voting {
            request.decided_at_ms = Some(now);
        }
        emit("vote_cast", json!({ "request_id": request_id, "voter": actor, "approve": approve, "status": status }));
        status
    }

    /// Treasurer only: record the receipt's SHA-256 and mark an approved request Spent.
    pub fn mark_spent(&mut self, request_id: u32, receipt_sha256: String, on_behalf_of: Option<AccountId>) {
        let actor = self.actor(on_behalf_of);
        self.require_role(&actor, &[Role::Treasurer]);
        require!(receipt_sha256.len() == 64 && receipt_sha256.chars().all(|c| c.is_ascii_hexdigit()), "Receipt hash must be a 64-character SHA-256 hex string");
        let request = self.request_mut(request_id);
        require!(matches!(request.status, RequestStatus::Approved | RequestStatus::AutoApproved), "Only approved requests can be marked Spent");
        request.status = RequestStatus::Spent;
        request.receipt = Some(Receipt { sha256: receipt_sha256.to_lowercase(), uploaded_by: actor.clone(), at_ms: env::block_timestamp_ms() });
        let amount = request.amount_cents;
        self.spent_cents += amount;
        emit("request_spent", json!({ "request_id": request_id, "by": actor, "amount_cents": amount }));
    }

    // ---------- Views ----------

    pub fn get_society(&self) -> Society {
        self.society.clone()
    }

    pub fn get_settings(&self) -> Settings {
        self.settings.clone()
    }

    pub fn get_roles(&self) -> Vec<(AccountId, Role)> {
        self.roles.iter().map(|(a, r)| (a.clone(), *r)).collect()
    }

    pub fn get_pass(&self, account_id: AccountId) -> Option<Pass> {
        self.pass_by_owner.get(&account_id).and_then(|n| self.passes.get(n - 1)).cloned()
    }

    pub fn get_passes(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<Pass> {
        page(&self.passes, from_index, limit)
    }

    pub fn get_request(&self, request_id: u32) -> Option<SpendRequest> {
        request_id.checked_sub(1).and_then(|i| self.requests.get(i)).cloned()
    }

    pub fn get_requests(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<SpendRequest> {
        page(&self.requests, from_index, limit)
    }

    pub fn get_stats(&self) -> Stats {
        Stats { passes: self.passes.len(), requests: self.requests.len(), spent_cents: self.spent_cents }
    }

    // ---------- NEP-171 views (passes as non-transferable NFTs) ----------

    pub fn nft_metadata(&self) -> NftContractMetadata {
        NftContractMetadata {
            spec: "nft-1.0.0".into(),
            name: format!("{} membership passes", self.society.name),
            symbol: self.society.short_name.clone(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        }
    }

    pub fn nft_token(&self, token_id: String) -> Option<Token> {
        let n: u32 = token_id.parse().ok()?;
        n.checked_sub(1).and_then(|i| self.passes.get(i)).map(|p| self.token(p))
    }

    pub fn nft_total_supply(&self) -> String {
        self.passes.len().to_string()
    }

    pub fn nft_tokens(&self, from_index: Option<String>, limit: Option<u32>) -> Vec<Token> {
        let from = from_index.and_then(|s| s.parse().ok());
        page(&self.passes, from, limit).iter().map(|p| self.token(p)).collect()
    }

    pub fn nft_supply_for_owner(&self, account_id: AccountId) -> String {
        u32::from(self.pass_by_owner.get(&account_id).is_some()).to_string()
    }

    pub fn nft_tokens_for_owner(&self, account_id: AccountId, from_index: Option<String>, limit: Option<u32>) -> Vec<Token> {
        let _ = (from_index, limit); // each member holds at most one pass
        self.get_pass(account_id).map(|p| vec![self.token(&p)]).unwrap_or_default()
    }

    /// Membership passes belong to the member and can't be transferred.
    #[payable]
    pub fn nft_transfer(&mut self, receiver_id: AccountId, token_id: String, approval_id: Option<u64>, memo: Option<String>) {
        let _ = (receiver_id, token_id, approval_id, memo);
        env::panic_str("Membership passes can't be transferred");
    }

    // ---------- Internal ----------

    /// The member this call acts for: the caller, or `on_behalf_of` when the
    /// contract account itself (the app's backend) records it for them.
    fn actor(&self, on_behalf_of: Option<AccountId>) -> AccountId {
        match on_behalf_of {
            Some(member) => {
                require!(env::predecessor_account_id() == env::current_account_id(), "Only the treasury app can act on behalf of a member");
                member
            }
            None => env::predecessor_account_id(),
        }
    }

    fn require_role(&self, account: &AccountId, allowed: &[Role]) {
        let ok = self.roles.get(account).is_some_and(|r| allowed.contains(r));
        require!(ok, "You don't have the committee role needed for this");
    }

    fn has_role(&self, role: Role) -> bool {
        self.roles.values().any(|r| *r == role)
    }

    fn request_mut(&mut self, request_id: u32) -> &mut SpendRequest {
        let index = request_id.checked_sub(1).unwrap_or_else(|| env::panic_str("No such request"));
        self.requests.get_mut(index).unwrap_or_else(|| env::panic_str("No such request"))
    }

    fn mint_pass(&mut self, owner: AccountId, fee_method: FeeMethod, fee_cents: u64, issued_by: AccountId) -> u32 {
        let number = self.passes.len() + 1;
        let pass = Pass { number, owner: owner.clone(), term: self.society.term.clone(), issued_at_ms: env::block_timestamp_ms(), issued_by, fee_method, fee_cents };
        self.passes.push(pass);
        self.pass_by_owner.insert(owner.clone(), number);
        // NEP-171 mint event, so indexers and wallets pick up the new pass.
        let log = json!({ "standard": "nep171", "version": "1.2.0", "event": "nft_mint", "data": [{ "owner_id": owner, "token_ids": [number.to_string()] }] });
        env::log_str(&format!("EVENT_JSON:{log}"));
        number
    }

    fn token(&self, p: &Pass) -> Token {
        Token {
            token_id: p.number.to_string(),
            owner_id: p.owner.clone(),
            metadata: TokenMetadata {
                title: Some(format!("{} member pass #{:04}", self.society.short_name, p.number)),
                description: Some(format!("Membership pass for {} ({}). Non-transferable.", self.society.name, p.term)),
                issued_at: Some(p.issued_at_ms.to_string()),
                extra: Some(json!({ "term": p.term, "fee_method": p.fee_method }).to_string()),
            },
        }
    }
}

fn page<T: Clone + near_sdk::borsh::BorshSerialize + near_sdk::borsh::BorshDeserialize>(v: &Vector<T>, from_index: Option<u32>, limit: Option<u32>) -> Vec<T> {
    let from = from_index.unwrap_or(0);
    let limit = limit.unwrap_or(50).min(100);
    (from..v.len()).take(limit as usize).filter_map(|i| v.get(i).cloned()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn acct(s: &str) -> AccountId {
        s.parse().unwrap()
    }
    const CONTRACT: &str = "treasury.testnet";

    fn as_caller(caller: &str) {
        testing_env!(VMContextBuilder::new().current_account_id(acct(CONTRACT)).predecessor_account_id(acct(caller)).block_timestamp(1_700_000_000_000_000_000).build());
    }

    fn setup() -> Treasury {
        as_caller(CONTRACT);
        Treasury::new(
            Society { name: "Computing Society".into(), short_name: "COMPSOC".into(), term: "2026/27".into() },
            Settings { approval_percent: 50, auto_approve_limit_cents: 2000, membership_fee_cents: 1500 },
            acct("pres.testnet"),
        )
    }

    /// President + treasurer + 3 committee members, all with passes.
    fn full_committee() -> Treasury {
        let mut t = setup();
        as_caller("pres.testnet");
        for m in ["treas.testnet", "c1.testnet", "c2.testnet", "c3.testnet", "student.testnet"] {
            t.issue_pass(acct(m), FeeMethod::Bank, 1500, None);
        }
        t.set_role(acct("treas.testnet"), Some(Role::Treasurer), None);
        for m in ["c1.testnet", "c2.testnet", "c3.testnet"] {
            t.set_role(acct(m), Some(Role::Committee), None);
        }
        t
    }

    #[test]
    fn init_issues_pass_one_to_president() {
        let t = setup();
        let pass = t.get_pass(acct("pres.testnet")).unwrap();
        assert_eq!(pass.number, 1);
        assert_eq!(pass.fee_method, FeeMethod::Waived);
        assert_eq!(t.get_roles(), vec![(acct("pres.testnet"), Role::President)]);
        assert_eq!(t.nft_token("1".into()).unwrap().owner_id, acct("pres.testnet"));
    }

    #[test]
    fn president_issues_passes_until_there_is_a_treasurer() {
        let mut t = full_committee();
        assert_eq!(t.get_stats().passes, 6);
        as_caller("pres.testnet");
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| t.issue_pass(acct("late.testnet"), FeeMethod::Cash, 1500, None)));
        assert!(result.is_err(), "president can't issue once a treasurer exists");
        as_caller("treas.testnet");
        assert_eq!(t.issue_pass(acct("late.testnet"), FeeMethod::Cash, 1500, None), 7);
    }

    #[test]
    #[should_panic(expected = "already has a pass")]
    fn one_pass_per_member() {
        let mut t = full_committee();
        as_caller("treas.testnet");
        t.issue_pass(acct("c1.testnet"), FeeMethod::Cash, 1500, None);
    }

    #[test]
    #[should_panic(expected = "at least 3 committee members")]
    fn needs_three_committee_members_to_request() {
        let mut t = setup();
        as_caller("pres.testnet");
        t.issue_pass(acct("treas.testnet"), FeeMethod::Cash, 1500, None);
        t.set_role(acct("treas.testnet"), Some(Role::Treasurer), None);
        // Only one other person could vote, so no request could ever pass.
        t.create_request("REQ-0001".into(), "Snacks".into(), "Food".into(), 500, None);
    }

    #[test]
    fn every_request_goes_to_a_vote() {
        let mut t = full_committee();
        as_caller("c1.testnet");
        // Even tiny amounts need the committee.
        let id = t.create_request("REQ-0001".into(), "Snacks".into(), "Food".into(), 100, None);
        assert_eq!(t.get_request(id).unwrap().status, RequestStatus::Voting);
        assert!(t.get_request(id).unwrap().decided_at_ms.is_none());
    }

    #[test]
    #[should_panic(expected = "committee role")]
    fn students_cannot_request() {
        let mut t = full_committee();
        as_caller("student.testnet");
        t.create_request("REQ-0001".into(), "Hoodies".into(), "Other".into(), 5000, None);
    }

    #[test]
    fn majority_approves_with_at_least_two_votes() {
        let mut t = full_committee();
        as_caller("c1.testnet");
        let id = t.create_request("REQ-0001".into(), "Pizza".into(), "Food".into(), 8640, None);
        // 4 eligible voters (requester excluded) at >50% means 3 yes votes.
        as_caller("pres.testnet");
        assert_eq!(t.vote(id, true, None), RequestStatus::Voting);
        as_caller("treas.testnet");
        assert_eq!(t.vote(id, true, None), RequestStatus::Voting);
        as_caller("c2.testnet");
        assert_eq!(t.vote(id, true, None), RequestStatus::Approved);
        assert!(t.get_request(id).unwrap().decided_at_ms.is_some());
    }

    #[test]
    fn rejected_once_approval_is_impossible() {
        let mut t = full_committee();
        as_caller("c1.testnet");
        let id = t.create_request("REQ-0001".into(), "Hoodies".into(), "Other".into(), 32000, None);
        as_caller("pres.testnet");
        t.vote(id, false, None);
        as_caller("treas.testnet");
        assert_eq!(t.vote(id, false, None), RequestStatus::Rejected);
    }

    #[test]
    #[should_panic(expected = "your own request")]
    fn no_voting_on_own_request() {
        let mut t = full_committee();
        as_caller("c1.testnet");
        let id = t.create_request("REQ-0001".into(), "Pizza".into(), "Food".into(), 8640, None);
        t.vote(id, true, None);
    }

    #[test]
    #[should_panic(expected = "already voted")]
    fn one_vote_each() {
        let mut t = full_committee();
        as_caller("c1.testnet");
        let id = t.create_request("REQ-0001".into(), "Pizza".into(), "Food".into(), 8640, None);
        as_caller("c2.testnet");
        t.vote(id, true, None);
        t.vote(id, false, None);
    }

    #[test]
    fn required_yes_never_below_two() {
        assert_eq!(required_yes(1, 50), 2);
        assert_eq!(required_yes(2, 50), 2);
        assert_eq!(required_yes(4, 50), 3);
        assert_eq!(required_yes(4, 75), 4);
        assert_eq!(required_yes(10, 90), 10);
    }

    #[test]
    fn treasurer_marks_spent_with_receipt_hash() {
        let mut t = full_committee();
        as_caller("c1.testnet");
        let id = t.create_request("REQ-0001".into(), "Snacks".into(), "Food".into(), 1500, None);
        for voter in ["pres.testnet", "treas.testnet", "c2.testnet"] {
            as_caller(voter);
            t.vote(id, true, None);
        }
        as_caller("treas.testnet");
        t.mark_spent(id, "A".repeat(64), None);
        let r = t.get_request(id).unwrap();
        assert_eq!(r.status, RequestStatus::Spent);
        assert_eq!(r.receipt.unwrap().sha256, "a".repeat(64));
        assert_eq!(t.get_stats().spent_cents, 1500);
    }

    #[test]
    #[should_panic(expected = "Only approved requests")]
    fn cannot_spend_unapproved_request() {
        let mut t = full_committee();
        as_caller("c1.testnet");
        let id = t.create_request("REQ-0001".into(), "Pizza".into(), "Food".into(), 8640, None);
        as_caller("treas.testnet");
        t.mark_spent(id, "a".repeat(64), None);
    }

    #[test]
    fn app_can_act_on_behalf_of_members() {
        let mut t = full_committee();
        as_caller(CONTRACT);
        let id = t.create_request("REQ-0001".into(), "Pizza".into(), "Food".into(), 8640, Some(acct("c1.testnet")));
        assert_eq!(t.get_request(id).unwrap().requester, acct("c1.testnet"));
        // The rules still apply to the member the app acts for.
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| t.vote(id, true, Some(acct("c1.testnet")))));
        assert!(result.is_err());
    }

    #[test]
    #[should_panic(expected = "Only the treasury app")]
    fn only_the_contract_account_can_act_on_behalf() {
        let mut t = full_committee();
        as_caller("c2.testnet");
        t.create_request("REQ-0001".into(), "Pizza".into(), "Food".into(), 8640, Some(acct("c1.testnet")));
    }

    #[test]
    fn one_treasurer_at_a_time_and_handover() {
        let mut t = full_committee();
        as_caller("pres.testnet");
        t.set_role(acct("c1.testnet"), Some(Role::Treasurer), None);
        let roles = t.get_roles();
        assert!(roles.contains(&(acct("c1.testnet"), Role::Treasurer)));
        assert!(roles.contains(&(acct("treas.testnet"), Role::Committee)));
        t.handover(acct("c2.testnet"), "2027/28".into(), None);
        assert_eq!(t.get_society().term, "2027/28");
        assert!(t.get_roles().contains(&(acct("c2.testnet"), Role::President)));
        assert!(!t.get_roles().iter().any(|(a, _)| *a == acct("pres.testnet")));
    }

    #[test]
    fn app_can_add_a_co_president() {
        let mut t = full_committee();
        as_caller(CONTRACT);
        t.add_president(acct("susan.testnet"));
        let pass = t.get_pass(acct("susan.testnet")).unwrap();
        assert_eq!(pass.fee_method, FeeMethod::Waived);
        let roles = t.get_roles();
        assert!(roles.contains(&(acct("susan.testnet"), Role::President)));
        assert!(roles.contains(&(acct("pres.testnet"), Role::President)), "existing president keeps their role");
        // An existing member can be promoted without a second pass.
        t.add_president(acct("c1.testnet"));
        assert_eq!(t.get_stats().passes, 7);
    }

    #[test]
    #[should_panic(expected = "Only the treasury app can add presidents")]
    fn only_the_contract_account_can_add_presidents() {
        let mut t = full_committee();
        as_caller("pres.testnet");
        t.add_president(acct("friend.testnet"));
    }

    #[test]
    #[should_panic(expected = "can't be transferred")]
    fn passes_are_not_transferable() {
        let mut t = full_committee();
        as_caller("student.testnet");
        t.nft_transfer(acct("c1.testnet"), "6".into(), None, None);
    }
}
