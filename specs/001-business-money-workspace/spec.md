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
3. A partner can see exactly how much capital they contributed, how much they lent temporarily, what they personally paid, what the business still owes them, what business money they physically hold, and what they withdrew.
4. An expense that requires approval changes real account balances when money actually moved, while its accountability status remains pending until the configured partner approvals are completed.
5. Users may edit transaction amounts and descriptive details. Amount edits are implemented as an automatic reversal plus linked replacement so the original financial history remains visible and balances stay correct.
6. A cash account can be closed for the day by comparing ledger-expected cash with physically counted cash.
7. A user with both Society and Business memberships chooses the workspace after login. A user with only one workspace still goes directly to it.
8. Business A can never read or change Business B through client queries or direct API calls.

## Financial semantics

- income: can be received immediately into a selected business money location or recorded as a receivable to collect later. Receivables support partial collections with payment history.
- expense: can be recorded as unpaid with no financial movement. Open expenses support partial payments from business money or a named partner's personal money.
- partner_capital: increases a business account and the partner's permanent capital contribution.
- partner_advance: user-facing "partner loan to business"; increases a business account and the amount the business owes that partner.
- personal_expense: does not change a business cash/bank balance; increases the amount the business owes that partner.
- reimbursement: decreases a business account and reduces the amount owed to the partner. It cannot exceed the outstanding due.
- withdrawal: decreases a business account and records that partner's withdrawal.
- transfer: decreases one account and increases another by the same amount.
- refund: increases a selected business account.
- reversal: mirrors the original ledger entries with opposite signs and links permanently to the original.

Approval status and payment status are deliberately separate. An unpaid expense can still be awaiting or receive approval without moving money. Once paid, real Cash/Bank or partner-due balances move immediately even if approval is still pending.


## Default expense categories

Every approved Business workspace starts with these expense categories, shown in this order:

1. Ad Spend / Marketing
2. Courier / Shipping
3. Packaging Material
4. Purchase / Inventory
5. Salaries / Contractor
6. Legal / Professional Fees
7. Food / Staff Welfare
8. Rent / Warehouse
9. Utilities / Internet
10. Software / Subscriptions
11. Repairs / Maintenance
12. Travel / Conveyance
13. Printing / Stationery
14. Payment Gateway / Bank Charges
15. Other / Miscellaneous

Sales / Receipts remains a separate income category.

## Review rules

Business setting supports amount-based accountability:

- no review
- one other partner above a configured amount
- one other partner above X and all other active partners above Y
- all expenses reviewed by all other active partners

Only admin/partner memberships can approve. The transaction creator cannot approve their own pending expense. Rejection marks the accountability decision; it does not pretend money returned to the business. A correction/refund/reversal must be recorded separately.

## Mobile UX

The Business workspace is mobile-first and deliberately denser than the housing committee UI.

- Centered max-width phone/tablet surface on larger displays.
- Five-position bottom navigation: Home, Ledger, raised Add, Money, Partners. Expense review remains available from the Action Inbox and More.
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


## Edit and delete controls

- Business records use explicit Edit and Delete actions where management is appropriate.
- Before an edit is committed, the UI requires the user to type exactly `EDIT`.
- Before a destructive/archive action is committed, the UI requires the user to type exactly `DELETE`.
- The current commercial rule allows hard deletion from explicit typed-confirm flows. Payment history and dependent ledger rows are removed with the deleted transaction.
- Transaction Edit can change the amount plus descriptive fields (counterparty/vendor, note, category and unpaid due date). Amount changes create an automatic reversal and linked replacement instead of rewriting posted ledger rows.
- Partner deletion disables active login access and archives the partner. The last Business Admin cannot be deleted, and a partner with an outstanding amount owed cannot be deleted until settled.
- Account deletion archives the account and requires its current balance to be ₹0. Opening balances remain immutable.
- Category deletion removes the category from new-entry forms while historical transactions keep their reference.
- Business deletion archives the workspace and disables memberships rather than cascade-deleting financial history.


## Ease-of-use operating layer

- Amount-first quick entry with four everyday choices: Money In, Expense, Partner Paid and Transfer; less-common money actions remain under More.
- Smart defaults remember the last account, partner, category, payment state and payer on the current device.
- Favourite transaction templates can be saved and reused.
- Any active transaction can be repeated from the ledger or the latest activity shortcut.
- Proof capture is offered immediately after saving and can also be attached/opened later from ledger details.
- Offline transaction drafts are kept on-device and automatically synced when connectivity returns.
- Voice-assisted entry uses browser speech recognition where available and pre-fills amount/type/account/partner/category for review before saving.
- Home acts as an Action Inbox for approvals, unpaid expenses, partner settlements, missing proofs, cash close, cash differences and offline entries.
- Home includes a team activity feed sourced from immutable Business activity logs.
- Partner cards include direct full/partial settlement from a selected Business account.
- Day close includes INR denomination counting and short/over reason capture.
- Reports support month selection, transaction CSV, CA Pack CSV and print/save-PDF.
- Bank statement CSV import supports common debit/credit and amount/type formats with a preview before posting.
- Daily Home/navigation/quick-entry labels support English, Gujarati and Hindi device-side preference.


## Money Flow v2

- A business account may optionally have a partner custodian. This models business cash/UPI held by a partner without turning it into a partner receivable or withdrawal.
- "Business money with partner/staff" is a business asset; "Business owes partner/staff" is personal money due back. The UI must never collapse these into one balance.
- Staff advances are treated as business money held by staff until spent, returned, or settled against a valid staff pocket expense.
- Partner and staff settlement can offset personal amounts due against business money already held, avoiding fake double cash movement.
- Money Map combines account locations, partner-held money, staff-held money, receivables, vendor payables, and personal amounts owed.
- Open income and expense transactions support partial settlement and keep an explicit payment-source history.
- Recurring money entries are templates that require a deliberate Post action; they never pretend to execute a bank payment automatically.
- Bank CSV import remembers narration-to-category choices per Business and flags likely duplicate rows before import.
- Once an income/expense has payment history, the normal edit path is limited to party/category/note/due-date metadata so prior settlement allocations are not silently rewritten.
