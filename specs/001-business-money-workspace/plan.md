# Implementation Plan

1. Keep Society unchanged as the primary product and add Business as a separate route/data domain.
2. Add an isolated BusinessProvider mounted only under /business so existing society pages continue using the existing DataProvider contract.
3. Add business-domain tables, helper functions, RLS policies, private proof storage and atomic RPCs through additive Supabase migrations. Append the same SQL to the canonical supabase/schema.sql.
4. Extend authentication resolution to combine Society memberships and approved Business memberships. If a user has only a pending/rejected Business onboarding request, route them to its status screen rather than treating it as an active workspace.
5. Gate Business activation behind platform-owner approval: requester submits business/contact details, `/owner/businesses` approves/rejects, and only approval materializes the Business workspace and first admin membership.
6. Build a compact mobile shell with bottom navigation and bottom-sheet transaction entry.
7. Implement dashboard, ledger, approvals, partners, accounts, reports, day close, settings and onboarding.
8. Add pure financial helper tests and extend the PostgreSQL isolation test suite with separate businesses, role/write checks, and the owner-approval onboarding gate.
9. Add a secondary Business section to the public homepage without changing the Society hero or current society pricing/positioning.
10. Run TypeScript, unit tests, production build, browser smoke tests and database isolation in CI. Apply the exact repository migrations to the live Supabase project and run Supabase security/performance advisors.
