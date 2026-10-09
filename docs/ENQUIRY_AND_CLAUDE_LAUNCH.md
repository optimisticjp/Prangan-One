# Enquiry tracking, PDF quotations, and Claude activation

## Local-only beta
Enquiry Tracker lives at /tools/enquiries. A visitor explicitly opts in before customer details are saved in localStorage. Data is unencrypted and readable by anyone using the same browser profile. It does not synchronize with Supabase or other devices. Do not use shared devices or sensitive customer information. The tracker offers search, due follow-up filters, status updates, deletion, JSON backup and restoration, with 100-record and field-size limits.

Create quotation transfers customer and service data using React Router state, not query parameters or server requests. The beta quotation editor creates a formatted local PDF using the existing html-to-image and jsPDF libraries. Browser rendering preserves Gujarati and Hindi script shaping. The resulting PDFs are raster images (not searchable text) and use a full-height page to avoid clipping. Quotes are drafts, not tax invoices.

## Smoke tests
1. Confirm saving without storage consent does not persist records.
2. Save a synthetic enquiry, reload, update its status and follow-up, search, export backup, import and delete.
3. Transfer to Quote Studio. Confirm the prefilled customer, service and details.
4. Create an editable quotation, download PDF and visually verify multilingual glyph shaping on mobile and desktop.
5. Test large inputs, storage exhaustion, and invalid backups.

## Staged Claude integration (still OFF)
The quote-assist function source is present but NOT deployed. No Claude API key is configured or used.
Before enabling:
1. Validate Anthropic organization billing, actual API model and spend caps.
2. Verify claude-haiku-5-5 structured output works in a controlled synthetic test.
3. Obtain user consent for sending service and job details; don't send customer name, contact or price.
4. Test Supabase OTP return to /tools/quote without interfering with society membership authentication.
5. Apply the quota migration only after disposable database tests for concurrency and authorization.
6. Add and test platform-wide quotas in addition to per-user quotas, with signup anti-abuse measures.
7. Deploy function server-only secrets, test denial and error flows, then set VITE_AI_QUOTE_ENABLED=true.
8. Monitor costs and roll back on anomalies.

## Security review
The GitHub security-audit workflow reports vulnerabilities separately for production and development dependencies and uploads JSON artifacts. Read advisories before upgrading and never apply npm audit fix --force blindly. Rerun the complete CI and Playwright checks on any package-lock changes.

## Data retention/legal notes
The old society product is separate from these browser-only betas. Before enabling a cloud-hosted CRM or AI processing of sensitive records, review data handling, disclosures and retention with a qualified India-focused advisor.
