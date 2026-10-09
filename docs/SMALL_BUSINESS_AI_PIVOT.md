# Prangan One: small-business AI product direction (October 2026)

## Status and truthful public claims

- Founded July 3, 2026. Founder reports bootstrapped, pre-revenue and no customers.
- pranganone.com is live and care@pranganone.com is the Console/company contact.
- Existing housing-society management application remains in the repository and is separate from the new offering.
- The business AI workspace is **planned and in development**. There is no live Claude-powered product, approved pilot, customer count, committed launch date, paid business AI plan, or grant approval to claim publicly.
- Keep all marketing features, screenshots, testimonials, prices and use-case claims truthful and current.

## Market research: competitor strategies, not copied claims

| Product | Verified offering | Implication for Prangan |
| --- | --- | --- |
| Zoho One | Connected lead-to-cash workflows across CRM, quotes, billing and follow-ups | Focus first on one simpler workflow, not 50 modules |
| HubSpot Breeze | AI-assisted quote drafting from CRM context with explicit review and permissions | Human-reviewed drafts and contextual data are table stakes |
| Zoho CRM Zia Agents | Specialized sales agents including quote creation | A generic AI chat box is weak differentiation |
| WhatsApp ecosystem | Existing small-business conversation channel | Start with user-approved manual sharing; don't promise unrestricted automation |

Primary sources:
- https://www.zoho.com/one/lead-to-cash.html
- https://knowledge.hubspot.com/ai/generate-quotes-with-breeze-assistant
- https://help.zoho.com/portal/en/kb/crm/zia-artificial-intelligence/nextgen-agentic-ai/articles/zia-agents-in-zoho-crm

## Claude for Startups: documented vs anecdotal

Official program: https://claude.com/programs/startups

As of October 9, 2026, public founder reports were contradictory: some applicants received decisions within minutes, while others reported immediate rejections, missing benefits, application-state glitches or capacity-related re-reviews. These anecdotes are **not** evidence of a guaranteed approval formula. Do not modify the app to fabricate eligibility, a business registration, product usage, fundraising, or customer traction. Verify the actual Console grant/benefit balance after a decision, not merely a portal badge.

Examples of public reports (unverified self-reports):
- https://www.reddit.com/r/ClaudeCode/comments/1wzpd5r/claude_startup_program/
- https://www.reddit.com/r/ClaudeAI/comments/1x0kc4i/approved_for_claude_startups_but_the_1000_api/
- https://www.reddit.com/r/ClaudeAI/comments/1x1af87/claude_startup_program_no_longer_offering_a_year/

## First customer and product hypothesis

Start with Indian small service firms: local repair/service providers, contractors, small agencies and consultants. Their core workflow is:

1. Capture inbound enquiry and missing facts.
2. Convert approved service items/prices into **editable** quote drafts.
3. Prepare reviewable replies in Gujarati, Hindi and English.
4. Track follow-up due dates and customer statuses.

Not planned for MVP: tax-compliance advice, payments on behalf of users, automated outbound messages, business intelligence dashboards, unrestricted agents.

Research goals before major backend work: ten interviews, three opt-in pilot users, evidence of repetitive quotation/follow-up problems.

## Engineering plan after public-site pivot

- Keep existing React/Vite frontend, Supabase auth, test infrastructure and RLS approach.
- Leave the society-specific schema/data intact until a migration and backup plan is approved.
- Create a dedicated business/workspace model instead of reusing society_id as a business tenant identifier.
- Migrate the existing public leads pipeline to generic business enquiries; today the contact form temporarily maps business name into legacy society_name field and uses Formspree as its primary delivery.
- Implement Claude through an authenticated server-side Edge Function; never expose API keys, scope every read by the business/role, validate structured outputs and place hard rate/cost limits.
- Before launching, review privacy terms for AI processing and obtain suitable consent for customer information. Messages/quotes require user approval before sending.
- Test in EN and GU now; add genuine Hindi UI support only when implemented.
- Do not change PWA start_url to the marketing homepage while the current installed PWA still targets the society app.

## Launch checklist

- [x] Public site accurately labels planned business-AI scope and pre-launch status.
- [x] Public pricing does not imply nonexistent paid AI plans.
- [x] Society login/demo remain reachable separately.
- [x] Original society app/backend retained.
- [ ] Review legal language with qualified advisor before public business-AI launch.
- [ ] Build first working AI workflow and test with users.
- [ ] Verify actual Anthropic program availability/application decisions.
- [ ] Update the old OG image if it depicts society-only content.
- [ ] Migrate leads table/forms to business-friendly field names.
- [ ] Establish real pricing after customer validation.
