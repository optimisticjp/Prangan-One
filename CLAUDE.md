# Claude Code — Web Builder Template

This repo is a reusable starter template for building websites, web apps, landing pages, dashboards, e-commerce stores, and marketing tools with Claude Code. It comes pre-loaded with 321 skills — 311 from 10 curated third-party sources plus the 10-skill official GitHub Spec Kit workflow — and a project constitution that governs how work is done.

---

## What This Repo Is

Use this as a foundation whenever a project involves:

- Static or dynamic websites
- Landing pages and marketing sites
- Web apps and dashboards
- E-commerce stores
- SEO-driven content sites
- Conversion-optimised tools or calculators
- Any frontend or full-stack web project

Clone or fork this template, then start building. The skills in `.claude/skills/` are available to all Claude Code sessions run inside this repo.

---

## How to Use the Installed Skills

321 skills are installed under `.claude/skills/`. **Do not activate all skills blindly.** Read the task first, then invoke only the skills that are directly relevant.

To invoke a skill, type `/skill-name` in the Claude Code chat. For example:

- `/frontend-design` — layout, components, responsive patterns
- `/ui-ux-pro-max` — full UI/UX orchestration
- `/seo` — SEO strategy and on-page optimisation
- `/humanizer` — make copy sound natural and human
- `/owasp-security` — security review against OWASP Top 10
- `/write-tests` — generate a test suite
- `/create-pr` — structured pull request creation

Run `/status` or `/analyse` when you need a broad overview before diving in.

---

## Spec Kit Workflow

The official [GitHub Spec Kit](https://github.com/github/spec-kit) is installed as 10 `speckit-*` skills. **Spec Kit is the default workflow** for:

- new production websites
- new web apps
- significant features
- any work with meaningful ambiguity

### Default sequence

Run the stages in order, each via its `/speckit-<stage>` skill:

```
constitution → specify → clarify → plan → checklist → tasks → analyze → implement → converge
```

| Stage | Skill | Purpose |
|---|---|---|
| constitution | `/speckit-constitution` | Establish or amend the governing project principles |
| specify | `/speckit-specify` | Capture the feature spec: outcome, users, requirements, success criteria |
| clarify | `/speckit-clarify` | Resolve ambiguity with targeted questions before planning |
| plan | `/speckit-plan` | Produce the implementation plan and design artifacts |
| checklist | `/speckit-checklist` | Validate requirement completeness, clarity, and consistency |
| tasks | `/speckit-tasks` | Generate dependency-ordered, actionable tasks |
| analyze | `/speckit-analyze` | Cross-artifact consistency check across spec, plan, and tasks |
| implement | `/speckit-implement` | Execute the tasks |
| converge | `/speckit-converge` | Assess the build against spec/plan and append any remaining work |

### Rules

- **Very small, low-risk changes may use a leaner workflow** when the requirement is already clear — a full spec-and-plan cycle is not required for a one-line copy fix.
- **Implementation must not begin before the spec and plan are sufficiently clear.** Never run `/speckit-implement` on an ambiguous or unplanned feature.
- **Select supporting skills during the relevant Spec Kit stages, not all at once.** For example: design, frontend, and SEO skills during `specify`/`plan`; security, TDD, and testing skills during `plan`/`implement`; context, research, and memory skills throughout. Do not activate all 321 skills blindly.
- **The constitution at `.specify/memory/constitution.md` is the governing source of project principles.** Every plan must pass its Constitution Check; documented exceptions go in the plan's Complexity Tracking.

---

## Default Checklist for Any Web Task

For any website, web app, landing page, dashboard, e-commerce build, SEO project, or marketing task, consider each of the following dimensions and apply relevant skills:

| Dimension | Skills to consider |
|---|---|
| UI/UX design | `ui-ux-pro-max`, `design`, `design-system`, `banner-design`, `slides` |
| Frontend implementation | `frontend-design`, `ui-styling` |
| Copy and tone | `humanizer`, `copywriting`, `copy-editing` |
| SEO | `seo`, `seo-technical`, `seo-content`, `seo-page`, `seo-schema`, `seo-sitemap`, `seo-audit` |
| Marketing and conversion | `cro`, `marketing-plan`, `product-marketing`, `landing page` flow via `content-strategy` |
| Accessibility | Apply WCAG 2.1 AA as a baseline; reference `ui-ux-pro-max` |
| Mobile responsiveness | Validate layouts at 375px, 768px, 1280px breakpoints minimum |
| Performance | Minimise render-blocking assets; target Core Web Vitals green |
| Security | `owasp-security` before final delivery |
| Testing | `test-driven-development`, `write-tests`, `test-coverage` |
| Context and planning | `make-plan`, `context-engineering`, `plan-task`, `brainstorm` |

You do not need to apply every row to every task. Use judgement. A small copy edit does not need a full security review. A public-facing checkout flow does.

---

## Working Style

### Ask essential questions only
Before starting a large task, ask only the questions you cannot proceed without. Avoid questionnaires. One to three clarifying questions maximum, then begin.

### Plan before large edits
For any change that touches more than two files or introduces a new feature, produce a brief implementation plan first (file list, approach, order of operations) and confirm before editing.

### Test-driven development when practical
For logic-heavy code, write failing tests first, then implement. Use `/test-driven-development` or `/write-tests` to scaffold. This is especially important for form validation, API integrations, and data transforms.

### Security and quality checks before delivery
Before marking any feature complete, run `/owasp-security` on new endpoints or form handlers, and `/review-local-changes` or `/code-review` on the diff. Fix findings before handoff.

### Handoff notes after each session
At the end of each working session, produce a short summary of: what was built, what remains, known issues, and any environment or configuration steps needed to continue. Keep it in the conversation or write it to a `SESSION_NOTES.md` if the project warrants it.

---

## Skill Caveats

Some skills have external dependencies that are not bundled in this template:

- **TDD Guard** (`/tdd-guard`): Requires per-project npm install (`npm install -D tdd-guard-vitest` or equivalent). The skill guides setup but cannot run without the package.
- **Claude Mem advanced tools** (`/mem-search`, `/knowledge-agent`, `/smart-explore`, `/pathfinder`): Require a running Docker container and MCP server. See [github.com/thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) for setup.
- **Scientific and data skills**: Skills such as `scanpy`, `rdkit`, `pytorch-lightning`, `qiskit`, and others are only relevant for data-heavy or scientific projects. Do not invoke them for standard web builds.
- **API-dependent SEO skills** (`seo-dataforseo`, `seo-google`): Require environment variables for external API keys. Configure per-project before use.

---

## What Not To Do

- Do not modify files inside `.claude/skills/`. Those are upstream skill definitions and should remain untouched.
- Do not create website or project files unless explicitly asked to begin building.
- Do not invoke skills speculatively or as a way to pad responses. Only invoke a skill when it meaningfully contributes to the current task.

---

## Installed Skills Reference

321 skills are installed from 10 curated third-party sources plus the official GitHub Spec Kit. Full details are in `INSTALL_REPORT.md`.

| Source | Count | Key skills |
|---|---|---|
| UI/UX Pro Max | 7 | `ui-ux-pro-max`, `design`, `design-system`, `brand`, `slides`, `ui-styling`, `banner-design` |
| Blader Humanizer | 1 | `humanizer` |
| Frontend Design (Anthropic) | 1 | `frontend-design` |
| Claude SEO | 25 | `seo`, `seo-audit`, `seo-technical`, `seo-content`, `seo-schema`, `seo-sitemap`, + 19 more |
| Marketing Skills | 44 | `cro`, `copywriting`, `marketing-plan`, `product-marketing`, `social`, `email`, + 38 more |
| OWASP Security | 1 | `owasp-security` |
| TDD Guard | 1 | `tdd-guard` (requires npm setup) |
| Context Engineering Kit | 67 | `context-engineering`, `make-plan`, `brainstorm`, `create-pr`, `commit`, `write-tests`, + 61 more |
| Claude Scientific Skills | 147 | Scientific computing, bioinformatics, ML, quantum, data analysis (use only when relevant) |
| Claude Mem | 17 | `babysit`, `timeline-report`, `make-plan`, `version-bump`, `wowerpoint`, + memory tools |
| GitHub Spec Kit | 10 | `speckit-constitution`, `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-implement`, + 4 more |
