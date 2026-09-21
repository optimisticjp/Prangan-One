# Business Money Workspace

## Goal

Add a first-class Business workspace to Prangan One without changing the existing housing-society data model. The homepage remains society-first. Business is presented as an additional Prangan One workspace and establishes the pattern for future niche workspaces.

The product is for small, partner-led and unorganised businesses that need trustworthy day-to-day money records without invoicing, GST filing, inventory, payroll, CRM, or accounting jargon.

## Primary users

- Business admin: configures the business, partners, accounts and approval rules.
- Partner: sees business finances, records money movement, contributes funds and participates in approvals.
- Bookkeeper: records day-to-day transactions but cannot administer partners/settings or approve partner expenses.
- Viewer: read-only access for an auditor, family member or trusted stakeholder.

## Core journeys

1. An authenticated user with no business submits a business onboarding request. No Business workspace or membership exists yet. The Prangan One platform owner reviews the request in `/owner/businesses`; approval creates the business, first admin partner, active membership, and default Cash/Bank accounts.
2. A business records money received, business expenses, partner capital, partner advances, partner-paid expenses, reimbursements, partner withdrawals, refunds and account transfers. Any active partner can record an expense as unpaid first and settle it later.
3. A partner can see exactly how much capital they contributed, how much they advanced temporarily, what they personally paid, what the business still owes them and what they withdrew.
4. An expense that requires approval changes real account balances when money actually moved, while its accountability status remains pending until the configured partner approvals are completed.
5. Posted transactions are never silently edited. A correction creates a reversal that preserves the original record and an audit trail.
6. A cash account can be closed for the day by comparing ledger-expected cash with physically counted cash.
7. A user with both Society and Business memberships chooses the workspace after login. A user with only one workspace still goes directly to it.
8. Business A can never read or change Business B through client queries or direct API calls.

## Financial semantics

- income: increases a selected business account.
- expense: can be recorded as unpaid with no financial movement. When marked paid, it either decreases the selected business account or, if a partner paid personally, increases the amount the business owes that partner.
- partner_capital: increases a business account and the partner's permanent capital contribution.
- partner_advance: increases a business account and the amount the business owes that partner.
- personal_expense: does not change a business cash/bank balance; increases the amount the business owes that partner.
- reimbursement: decreases a business account and reduces the amount owed to the partner. It cannot exceed the outstanding due.
- withdrawal: decreases a business account and records that partner's withdrawal.
- transfer: decreases one account and increases another by the same amount.
- refund: increases a selected business account.
- reversal: mirrors the original ledger entries with opposite signs and links permanently to the original.

Approval status and payment status are deliberately separate. An unpaid expense can still be awaiting or receive approval without moving money. Once paid, real Cash/Bank or partner-due balances move immediately even if approval is still pending.

## Approval rules

Business setting:

- none
- one other partner
- all other active partners

Only admin/partner memberships can approve. The transaction creator cannot approve their own pending expense. Rejection marks the accountability decision; it does not pretend money returned to the business. A correction/refund/reversal must be recorded separately.

## Mobile UX

The Business workspace is mobile-first and deliberately denser than the housing committee UI.

- Centered max-width phone/tablet surface on larger displays.
- Five-position bottom navigation: Home, Ledger, raised Add, Approvals, Partners.
- Compact header with business switcher.
- 34-40px visual controls may be used where appropriate, while touch targets remain roughly 44px or larger.
- Dense one-line ledger rows and small account/partner cards.
- Transaction actions carry short purpose tags (for example RECEIVE, EXPENSE, CAPITAL, ADVANCE, REPAY, MOVE) so similar money actions are not ambiguous.
- Expense rows show payment tags (UNPAID/PAID) separately from approval tags.
- Bottom-sheet transaction entry.
- No large hero panels or excessive vertical whitespace inside the workspace.
- Test at 320, 360, 390, 412, 768 and 1024+ widths.
- No accidental horizontal page scrolling.

## Platform onboarding gate

- Public/authenticated users can request a Business workspace but cannot activate one themselves.
- Pending requests contain only business/contact onboarding details; financial setup begins after approval.
- The legacy instant-create RPC is disabled at the database level so an old client cannot bypass approval.
- Only a real platform owner membership can approve or reject a request.
- Rejection can include a reason; the requester can submit a new request afterward.

## Security and integrity

- Every business-domain row is scoped by business_id where applicable.
- Postgres RLS, not the React UI, is the authorization boundary.
- Financial posting, approval, reversal and day closing use database functions so multi-row changes are atomic.
- Important actions create immutable activity records.
- Receipt/proof files use a private Supabase Storage bucket.
- Cross-business isolation is covered by the Postgres isolation suite.

## First release includes

- Owner-approved Business onboarding (request → platform owner approval/rejection → workspace activation)
- Multiple business memberships and switching
- Cash/bank/UPI/wallet/other accounts
- Partner records and login-linked partner membership
- Core transaction types listed above
- Unpaid → paid expense lifecycle, including optional due date and settlement by Business funds or a named partner
- Partner positions
- Expense approvals
- Private proof upload
- Ledger search/filter/detail/reversal
- Daily cash closing and admin reopen with reason
- Summary reports and CSV export
- Secondary homepage promotion while Society remains the primary homepage story

## Out of scope

- Invoicing
- GST returns/e-invoicing/e-way bills
- Inventory
- CRM
- Payroll/attendance
- Purchase orders
- Bank API synchronization
- Payment gateways
- Full double-entry accounting screens
- Tally replacement
