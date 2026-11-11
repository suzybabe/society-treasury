// Explorer links for NEAR testnet. NearBlocks opens directly, without the
// explorer.testnet.near.org page that asks you to pick an explorer.

const EXPLORER = 'https://testnet.nearblocks.io'

export const explorerTx = (hash: string) => `${EXPLORER}/txns/${hash}`
export const explorerAccount = (id: string) => `${EXPLORER}/address/${id}`

/** Plain-English names for the contract methods the app calls. */
export const CHAIN_METHOD_LABEL: Record<string, string> = {
  issue_pass: 'Membership pass minted',
  add_president: 'Co-president added',
  set_role: 'Committee role changed',
  handover: 'Presidency handed over',
  update_settings: 'Voting rules updated',
  create_request: 'Spending request created',
  vote: 'Committee vote cast',
  student_vote: 'Student vote cast',
  set_student_quorum: 'Student quorum updated',
  mark_spent: 'Receipt recorded, marked Spent',
}
