// Explorer links for NEAR testnet (the official explorer, also used by near CLI).

const EXPLORER = 'https://explorer.testnet.near.org'

export const explorerTx = (hash: string) => `${EXPLORER}/transactions/${hash}`
export const explorerAccount = (id: string) => `${EXPLORER}/accounts/${id}`

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
