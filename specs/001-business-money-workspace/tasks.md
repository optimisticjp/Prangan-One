# Tasks

- [x] Define business roles, transactions, approval semantics and partner positions.
- [x] Design additive database model separate from Society.
- [x] Add RLS helpers and policies.
- [x] Add atomic transaction, approval, reversal and cash-close RPCs.
- [x] Add private business proof storage rules.
- [x] Add business Supabase adapter and isolated BusinessProvider.
- [x] Add workspace-aware login resolution.
- [x] Route pending/rejected business applicants to onboarding status instead of generic no-access.
- [x] Add `/owner/businesses` approval/rejection inbox and owner dashboard entry.
- [x] Disable the legacy instant-create RPC at the database boundary.
- [x] Add owner-approved Business onboarding request flow.
- [x] Add compact mobile Business shell and quick transaction sheet.
- [x] Add dashboard and account balance overview.
- [x] Add searchable/filterable ledger and CSV export.
- [x] Add partner positions and partner creation.
- [x] Add approval queue.
- [x] Add accounts management.
- [x] Add reports.
- [x] Add daily cash closing and admin reopen.
- [x] Add business settings.
- [x] Add secondary Business promotion on the Society-first homepage.
- [x] Add financial helper unit tests.
- [x] Extend database isolation coverage for Business A vs Business B.
- [ ] Pass CI after the approval-gate correction.
- [x] Apply owner-approval migration to live Supabase.
- [ ] Complete live approval-flow smoke checklist after deployment.

- [x] Clarify Business transaction actions with purpose tags and helper text.
- [x] Add unpaid expense recording without changing Cash/Bank/partner balances.
- [x] Add atomic mark-paid flow for Business funds or a named partner.
- [x] Separate payment-status tags from approval-status tags in Business UI.
- [x] Add isolation tests proving active partners can record and settle unpaid expenses.

- [x] Add reusable typed EDIT / DELETE confirmation modal.
- [x] Add partner edit/delete with login-access and last-admin safeguards.
- [x] Add account edit/delete with zero-balance requirement.
- [x] Add category management with edit/delete controls.
- [x] Add transaction descriptive edit and audit-safe delete/reversal.
- [x] Require EDIT confirmation for Business settings and DELETE for Business archive.
- [x] Preserve inactive partner/account/category references for historical ledger display.

- [x] Redesign Business Home around total funds, today movement, quick actions and Action Inbox.
- [x] Make transaction entry amount-first with four primary daily actions and advanced actions behind More.
- [x] Add smart per-business entry defaults on device.
- [x] Add favourite transaction templates and repeat-last/repeat-any transaction.
- [x] Add post-save camera/proof capture and proof viewing from ledger.
- [x] Add offline transaction draft queue with auto-sync on reconnect.
- [x] Add browser voice-assisted transaction entry.
- [x] Add English / Gujarati / Hindi preference for core Business surfaces.
- [x] Add partner settlement action with partial/full reimbursement.
- [x] Add denomination-based INR cash day close and variance reasons.
- [x] Add monthly CA Pack CSV plus print/save-PDF reporting.
- [x] Add generic bank statement CSV importer with preview.
- [x] Add transaction amount editing as automatic reversal + linked replacement.
- [x] Add activity-log feed and smart operational alerts.
- [x] Add unit tests for bank statement parsing and isolation tests for amount-correction accounting.


## Business Money Flow v2

- [x] Model partner-held business money separately from partner personal dues.
- [x] Add partner custodian to money locations and surface holder in account UI.
- [x] Add Money Map for location/custody, receivables, payables and personal dues.
- [x] Add open customer receivables and partial collections.
- [x] Add partial vendor payments from business or partner personal money.
- [x] Keep per-settlement payment-source history.
- [x] Add smart partner settlement from business money already held.
- [x] Treat staff advances as business assets held by staff and include them in total funds.
- [x] Add staff settlement: offset pocket dues and return unused held money.
- [x] Add amount-based expense review thresholds.
- [x] Reword approval UI as post-record accountability review where money already moved.
- [x] Add recurring money templates with explicit posting.
- [x] Add narration category memory and likely-duplicate filtering to bank import.
- [x] Extend cash close to partner-held cash locations.
- [x] Add unit tests for partial settlement totals and statement rule memory.
- [x] Extend database isolation coverage for new settlement RPCs.
- [ ] Confirm full CI after Business Money Flow v2 lands on main.
