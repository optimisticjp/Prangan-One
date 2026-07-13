<!--
SYNC IMPACT REPORT
==================
Version change: (uninitialized template) → 1.0.0
Bump rationale: Initial ratification of the project constitution. First concrete
  set of governing principles replacing the placeholder template. MAJOR baseline.

Modified principles: N/A (initial adoption)
Added principles (14):
  I.    Spec Before Code
  II.   Mobile-First Is Non-Negotiable
  III.  Speed Is Non-Negotiable
  IV.   Deliberate Design, Not Generic
  V.    Selective Skill Activation
  VI.   Human-Sounding Content
  VII.  SEO Is Part of the Build
  VIII. Accessibility Is Part of the Build
  IX.   Security Is Part of the Build
  X.    Test Important Behavior
  XI.   Spec Kit Workflow
  XII.  Efficient Context
  XIII. Preview Without Deployment
  XIV.  Definition of Done
Added sections: Governance
Removed sections: None (placeholder template slots fully replaced)

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" reads dynamically
     from this file ("[Gates determined based on constitution file]"); no edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-specific tokens; aligned.
  ✅ .specify/templates/tasks-template.md — no constitution-specific tokens; aligned.
  ✅ .specify/templates/checklist-template.md — generic; aligned.
  ✅ CLAUDE.md — existing template guidance is consistent with these principles;
     no edit required for ratification.

Follow-up TODOs: None. No placeholders deferred.
-->

# Web Builder Template Constitution

This constitution defines the permanent governing principles for this reusable
website and web-tool builder template. It applies to every project created from
this GitHub template. Principles are non-negotiable defaults: deviations require
an explicit, documented justification recorded in the relevant project artifact
(spec, plan, or Complexity Tracking). This constitution supersedes ad-hoc
preferences expressed only in chat.

## Core Principles

### I. Spec Before Code
Meaningful implementation MUST NOT begin from a vague idea. For a new website or
a significant feature, the outcome, target users, requirements, constraints, and
success criteria MUST be defined before implementation starts. Research and
planning happen before code. Large decisions MUST be captured in project
artifacts so they are not repeatedly re-explained.
Rationale: A written spec is the cheapest place to catch a wrong assumption, and
durable artifacts prevent context loss across sessions.

### II. Mobile-First Is Non-Negotiable
Interfaces MUST be designed from small screens upward. Every interface MUST work
correctly at approximately 360px, 390px, 768px, 1024px, and large desktop.
There MUST be no horizontal overflow and no desktop-only interactions. Touch
targets MUST be practical. Navigation, forms, tables, pricing sections,
accordions, cards, and media MUST work cleanly on mobile.
Rationale: Most real traffic is mobile; a layout that only works on desktop is
not done.

### III. Speed Is Non-Negotiable
Prefer the smallest sensible technical solution. Unnecessary dependencies MUST be
avoided. Heavy animation libraries MUST NOT be used where CSS or lightweight
native techniques suffice. Client-side JavaScript MUST be minimized. Images,
fonts, icons, and media MUST be optimized; non-critical assets MUST be
lazy-loaded; layout shift MUST be prevented. Autoplay background video MUST be
avoided unless the project truly requires it. Heavy parallax and scroll effects
MUST be disabled or simplified on mobile when they hurt performance, and
`prefers-reduced-motion` MUST be respected. Target Lighthouse mobile performance
of 90+ where realistically possible, with 95+ as a best-effort target.
Rationale: Performance is a feature and a ranking factor; weight added carelessly
is rarely removed later.

### IV. Deliberate Design, Not Generic
Before implementation, a coherent visual direction MUST be selected: one primary
aesthetic, at most one secondary accent aesthetic, one primary emotional feel,
one primary layout system, a limited animation vocabulary, a clear typography
system, and a clear color system. Many trends MUST NOT be combined into one
project. "Style soup" is prohibited. Generic defaults — purple gradients,
system-font SaaS layouts, random glass cards, and excessive rounded rectangles —
MUST NOT be the fallback.
Rationale: A chosen, constrained direction reads as intentional; unconstrained
mixing reads as generic.

### V. Selective Skill Activation
This template contains 321 installed skills. Skills MUST NOT be activated
blindly or speculatively. Only skills directly relevant to the current task may
be invoked. For website work, consider when relevant: UI/UX Pro Max, Frontend
Design, Humanizer, SEO, Marketing and CRO, OWASP Security, TDD and testing,
Context Engineering, project memory and handoffs, and Spec Kit for the
requirements and implementation workflow. Scientific and data skills are reserved
for data-heavy or research-heavy work.
Rationale: Relevance beats volume; invoking unrelated skills wastes context and
degrades output quality.

### VI. Human-Sounding Content
Copy MUST avoid generic AI language, inflated marketing claims, excessive em
dashes, repeated rule-of-three phrasing, and vague hype. Clear meaning MUST be
preserved, and tone MUST match the actual audience and brand.
Rationale: Trust comes from copy that sounds like a real person who understands
the reader, not a template.

### VII. SEO Is Part of the Build
Every public website MUST consider, where relevant: semantic page structure;
titles and meta descriptions; heading hierarchy; crawlability; canonical
strategy; structured data; sitemap and robots handling; internal linking; image
alt text; performance; and AI-search / GEO / AEO considerations.
Rationale: SEO decisions are cheapest at build time and expensive to retrofit.

### VIII. Accessibility Is Part of the Build
Builds MUST use semantic HTML, keyboard-accessible interactions, visible focus
states, proper labels, meaningful alternative text, sufficient contrast,
reduced-motion support, and accessible forms and error handling. WCAG 2.1 AA is
the default baseline where practical.
Rationale: Accessibility is a correctness and inclusion requirement, not an
optional polish step.

### IX. Security Is Part of the Build
OWASP-style thinking MUST be applied where relevant: validate inputs; protect
secrets; never hardcode credentials; review authentication and authorization;
secure forms and APIs; minimize permissions; review third-party scripts; handle
environment variables correctly; assess dependency risk; and perform a
pre-launch security check.
Rationale: A single exposed secret or unvalidated input can undo an entire build.

### X. Test Important Behavior
Test-driven development MUST be used when practical. For meaningful
functionality, acceptance criteria MUST be defined first, tests written before
implementation when practical, critical user flows tested, and regressions
prevented. Trivial presentation details MUST NOT be over-tested, and a heavy
testing stack MUST NOT be added to a simple static site without reason.
Rationale: Tests protect the behavior that matters; testing everything equally
wastes effort and slows delivery.

### XI. Spec Kit Workflow
For new production websites and meaningful features, the default workflow is:
constitution → specify → clarify → plan → checklist → tasks → analyze →
implement → converge. `implement` MUST NOT run before the spec and plan are
sufficiently clear. A leaner workflow is permitted for very small, low-risk
changes when the requirement is already clear.
Rationale: The workflow front-loads clarity so implementation is mechanical
rather than exploratory.

### XII. Efficient Context
Concise artifacts MUST be preferred over repeatedly re-explaining the project in
chat. Full file contents MUST NOT be pasted unless requested. Summaries MUST
focus on decisions, changed files, checks, blockers, and next actions. Large
builds MUST be broken into phases, handoff notes kept for future sessions, and
context compacted before quality degrades.
Rationale: Context is a finite resource; spending it on repetition starves the
work that needs it.

### XIII. Preview Without Deployment
The user works entirely in the cloud. Work MUST NOT require Codespaces, a
local-machine workflow, or deployment merely to review progress. Available Claude
Code Web preview capabilities MUST be used when available; otherwise a concise
build report and the safest cloud-based review path MUST be provided.
Rationale: Review must fit the user's actual environment, not an assumed local
setup.

### XIV. Definition of Done
A website is not done merely because it builds. Before completion, the following
MUST be verified: requirements implemented; mobile behavior correct; visual
direction coherent; important copy humanized; SEO basics present; accessibility
basics present; security checks complete; relevant tests passing; build and lint
checks passing where available; no unnecessary dependencies added; no obvious
unfinished placeholders remaining; performance choices documented; and remaining
gaps identified through convergence.
Rationale: "Done" is a verified checklist, not a successful build command.

## Governance

Authority: This constitution supersedes ad-hoc practices and chat-only
preferences. When a principle conflicts with a convenience, the principle wins
unless a documented, approved exception exists.

Compliance: Every plan produced via the Spec Kit workflow MUST pass the
Constitution Check gate before Phase 0 research and be re-checked after Phase 1
design. Any violation MUST be recorded in the plan's Complexity Tracking table
with the reason it is needed and why a simpler, compliant alternative was
rejected. Unjustified violations MUST be resolved before implementation.

Amendment procedure: Amendments MUST be proposed as an edit to this file with a
Sync Impact Report describing the change, the version bump, and any dependent
templates or guidance requiring updates. Dependent artifacts
(`.specify/templates/*`, `CLAUDE.md`, and runtime guidance) MUST be re-checked
for alignment when principles are added, removed, or materially changed.

Versioning policy: This constitution follows semantic versioning.
- MAJOR: backward-incompatible governance changes or principle removals/redefinitions.
- MINOR: a new principle or section, or materially expanded guidance.
- PATCH: clarifications, wording, and non-semantic refinements.

Scope: These principles are defaults for web builds. Data-heavy, scientific, or
research projects may invoke additional skills and standards, but MUST NOT
weaken the security, accessibility, and Definition-of-Done requirements above.

**Version**: 1.0.0 | **Ratified**: 2026-07-10 | **Last Amended**: 2026-07-10
