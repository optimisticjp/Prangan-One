# Skill Installation Report

**Date:** 2026-06-23  
**Target:** `.claude/skills/` (project scope)  
**Total skills installed:** 311  

---

## Summary

| # | Source | Skills Installed | Status |
|---|--------|-----------------|--------|
| 1 | [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 7 | ✅ Full |
| 2 | [Blader Humanizer](https://github.com/blader/humanizer) | 1 | ✅ Full |
| 3 | [Frontend Design (Anthropic)](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) | 1 | ✅ Full |
| 4 | [Claude SEO](https://github.com/AgriciDaniel/claude-seo) | 25 | ✅ Full |
| 5 | [Marketing Skills](https://github.com/coreyhaines31/marketingskills) | 44 | ⚠️ 1 skipped (conflict) |
| 6 | [OWASP Security](https://github.com/agamm/claude-code-owasp) | 1 | ✅ Full |
| 7 | [TDD Guard](https://github.com/nizos/tdd-guard) | 1 | ⚠️ Requires npm setup |
| 8 | [Context Engineering Kit](https://github.com/NeoLabHQ/context-engineering-kit) | 67 | ✅ Full |
| 9 | [Claude Scientific Skills](https://github.com/K-Dense-AI/claude-scientific-skills) | 147 | ✅ Full |
| 10 | [Claude Mem](https://github.com/thedotmack/claude-mem) | 17 | ⚠️ Some skills require running service |

---

## 1. UI/UX Pro Max
**Source:** `github.com/nextlevelbuilder/ui-ux-pro-max-skill`  
**Location in source:** `.claude/skills/`  
**Installed to:** `.claude/skills/`

Skills copied:
- `banner-design` — banner layout and sizing guidance
- `brand` — brand guidelines, color palettes, typography (includes scripts and reference docs)
- `design` — logo, icon, CIP, slides design (includes Python scripts and data CSVs)
- `design-system` — component specs, tokens, slide logic (includes data CSVs)
- `slides` — presentation slide creation
- `ui-styling` — UI styling patterns
- `ui-ux-pro-max` — master UI/UX orchestration skill

---

## 2. Blader Humanizer
**Source:** `github.com/blader/humanizer`  
**Location in source:** root `SKILL.md`  
**Installed to:** `.claude/skills/humanizer/`

Files copied: `SKILL.md`, `AGENTS.md`  
Single skill for humanizing AI-generated text to sound more natural.

---

## 3. Frontend Design (Anthropic)
**Source:** `github.com/anthropics/claude-code` → `plugins/frontend-design/skills/frontend-design/`  
**Installed to:** `.claude/skills/frontend-design/`

Official Anthropic frontend design skill. Contains a single `SKILL.md` with Anthropic's recommended frontend design patterns.

---

## 4. Claude SEO
**Source:** `github.com/AgriciDaniel/claude-seo`  
**Location in source:** `skills/`  
**Installed to:** `.claude/skills/`

25 skills installed:

| Skill | Description |
|-------|-------------|
| `seo` | Core SEO orchestration |
| `seo-audit` | Full-site SEO audit with parallel subagents (up to 500 pages) |
| `seo-backlinks` | Backlink analysis and strategy |
| `seo-cluster` | Topic cluster and pillar page planning |
| `seo-competitor-pages` | Competitor page analysis |
| `seo-content` | SEO content creation |
| `seo-content-brief` | Content brief generation |
| `seo-dataforseo` | DataForSEO API integration |
| `seo-drift` | Content decay detection |
| `seo-ecommerce` | E-commerce SEO |
| `seo-flow` | SEO workflow orchestration |
| `seo-geo` | Geo-targeted SEO |
| `seo-google` | Google Search Console integration |
| `seo-hreflang` | International hreflang tag generation |
| `seo-image-gen` | SEO-optimized image generation |
| `seo-images` | Image SEO optimization |
| `seo-local` | Local SEO |
| `seo-maps` | Google Maps / local pack optimization |
| `seo-page` | On-page SEO optimization |
| `seo-plan` | SEO strategy planning |
| `seo-programmatic` | Programmatic SEO page generation |
| `seo-schema` | Schema.org structured data |
| `seo-sitemap` | Sitemap generation and management |
| `seo-sxo` | Search experience optimization |
| `seo-technical` | Technical SEO audits |

**Note:** Some skills (e.g., `seo-dataforseo`, `seo-google`) reference external API keys. Configure via environment variables as documented in the source repo.

---

## 5. Marketing Skills
**Source:** `github.com/coreyhaines31/marketingskills`  
**Location in source:** `skills/`  
**Installed to:** `.claude/skills/`

44 skills installed (1 skipped — see conflicts below):

`ab-testing`, `ad-creative`, `ads`, `ai-seo`, `analytics`, `aso`, `churn-prevention`, `co-marketing`, `cold-email`, `community-marketing`, `competitor-profiling`, `competitors`, `content-strategy`, `copy-editing`, `copywriting`, `cro`, `customer-research`, `directory-submissions`, `emails`, `free-tools`, `image`, `launch`, `lead-magnets`, `marketing-ideas`, `marketing-plan`, `marketing-psychology`, `offers`, `onboarding`, `paywalls`, `popups`, `pricing`, `product-marketing`, `programmatic-seo`, `prospecting`, `public-relations`, `referrals`, `revops`, `sales-enablement`, `schema`, `signup`, `site-architecture`, `sms`, `social`, `video`

**Conflict skipped:** `seo-audit` — both `claude-seo` and `marketingskills` define this skill. The `claude-seo` version was kept (more comprehensive: multi-subagent, 500-page crawl). The `marketingskills` `seo-audit` was not installed.

---

## 6. OWASP Security
**Source:** `github.com/agamm/claude-code-owasp`  
**Location in source:** `.claude/skills/owasp-security/`  
**Installed to:** `.claude/skills/owasp-security/`

Contains `SKILL.md` and `reference/` directory with OWASP Top 10 reference material. No external dependencies.

---

## 7. TDD Guard
**Source:** `github.com/nizos/tdd-guard`  
**Location in source:** `plugin/skills/setup/`  
**Installed to:** `.claude/skills/tdd-guard/`

Single skill (`SKILL.md`) that sets up TDD Guard for a project.

**⚠️ External dependency required:** TDD Guard is a TypeScript tool that enforces test-driven development via Claude Code hooks. The `tdd-guard` skill installs the framework, but it requires npm packages:

```bash
# For Vitest projects
npm install -D tdd-guard-vitest

# For Jest projects
npm install -D tdd-guard-jest

# Other supported reporters: tdd-guard-pytest, tdd-guard-rspec, tdd-guard-junit5, etc.
```

The skill itself only uses read-only tools (`Read`, `Glob`, `Grep`) to detect the test framework and guide setup. Run `/tdd-guard` in a project to initiate setup.

---

## 8. Context Engineering Kit
**Source:** `github.com/NeoLabHQ/context-engineering-kit`  
**Location in source:** `plugins/*/skills/`  
**Installed to:** `.claude/skills/`

67 skills installed across 11 plugin groups:

| Plugin | Skills |
|--------|--------|
| `customaize-agent` | `agent-evaluation`, `apply-anthropic-skill-best-practices`, `context-engineering`, `create-agent`, `create-command`, `create-hook`, `create-rule`, `create-skill`, `create-workflow-command`, `prompt-engineering`, `test-prompt`, `test-skill`, `thought-based-reasoning` |
| `docs` | `update-docs`, `write-concisely` |
| `fpf` (Forward Propagation Framework) | `actualize`, `decay`, `propose-hypotheses`, `query`, `reset`, `status` |
| `git` | `analyze-issue`, `attach-review-to-pr`, `commit`, `create-pr`, `git-notes`, `git-worktrees`, `load-issues`, `load-pr-comments`, `resolve-fixed-pr-comments` |
| `kaizen` | `analyse`, `analyse-problem`, `cause-and-effect`, `kaizen`, `plan-do-check-act`, `root-cause-tracing`, `why` |
| `mcp` | `build-mcp`, `setup-arxiv-mcp`, `setup-codemap-cli`, `setup-context7-mcp`, `setup-serena-mcp` |
| `reflexion` | `critique`, `memorize`, `reflect` |
| `review` | `review-local-changes`, `review-pr` |
| `sadd` (Sub-Agent Driven Development) | `do-and-judge`, `do-competitively`, `do-in-parallel`, `do-in-steps`, `judge`, `judge-with-debate`, `launch-sub-agent`, `multi-agent-patterns`, `subagent-driven-development`, `tree-of-thoughts` |
| `sdd` (Specification Driven Development) | `add-task`, `brainstorm`, `create-ideas`, `implement-task`, `plan-task` |
| `tdd` | `design-testing-strategy`, `fix-tests`, `test-coverage`, `test-driven-development`, `write-tests` |

**Note:** The `reflexion` plugin also includes TypeScript hooks (`plugins/reflexion/hooks/`). Those were not copied since they require compilation. Only the SKILL.md files were installed.

---

## 9. Claude Scientific Skills
**Source:** `github.com/K-Dense-AI/claude-scientific-skills`  
**Location in source:** `skills/`  
**Installed to:** `.claude/skills/`

147 skills installed covering scientific computing, bioinformatics, chemistry, physics, ML, and research workflows. All skills are self-contained SKILL.md files. Many reference optional Python packages (e.g., `scanpy`, `rdkit`, `pytorch-lightning`) — those packages are not pre-installed and should be added to project environments as needed.

Sample skill categories:
- **Bioinformatics:** `scanpy`, `scvi-tools`, `biopython`, `pydeseq2`, `bulk-rnaseq`, `neuropixels-analysis`, `pysam`, `scvelo`, `anndata`, `gget`, `deeptools`
- **Cheminformatics:** `rdkit`, `deepchem`, `molfeat`, `datamol`, `pyopenms`, `matchms`
- **Machine Learning:** `scikit-learn`, `pytorch-lightning`, `transformers`, `stable-baselines3`, `torch-geometric`, `shap`, `umap-learn`
- **Scientific writing:** `scientific-writing`, `literature-review`, `latex-posters`, `peer-review`, `citation-management`
- **Data analysis:** `polars`, `dask`, `statsmodels`, `matplotlib`, `seaborn`, `scipy` (via `statistical-analysis`)
- **Quantum:** `qiskit`, `pennylane`, `qutip`

---

## 10. Claude Mem
**Source:** `github.com/thedotmack/claude-mem`  
**Location in source:** `plugin/skills/`  
**Installed to:** `.claude/skills/`

17 skills installed.

**⚠️ Service architecture notice:** Claude Mem is primarily a persistent cross-session memory service — it runs as a background Docker container with an MCP server that indexes Claude Code transcripts. Many of the skills listed below are designed to interface with this running service. **Skills that reference the memory database (`mem-search`, `knowledge-agent`, `smart-explore`, `pathfinder`) will not function without the service running.**

Skills requiring the claude-mem service (Docker + MCP):
- `mem-search` — searches persistent cross-session memory database
- `knowledge-agent` — queries learned knowledge from past sessions
- `smart-explore` — explores codebase using past memory context
- `pathfinder` — navigates unfamiliar codebases using memory

Skills that are largely standalone (no service required):
- `babysit` — monitors a PR until mergeable
- `design-is` — design ideation skill
- `do` — general task execution skill
- `how-it-works` — explains how something works in the codebase
- `learn-codebase` — learns and documents a codebase
- `make-plan` — structured planning skill
- `oh-my-issues` — issue triage and management
- `standup` — git worktree standup across branches
- `timeline-report` — generates timeline reports from git history
- `version-bump` — semantic version bumping skill (includes scripts)
- `weekly-digests` — weekly progress digest generation
- `what-the` — explains unexpected behavior
- `wowerpoint` — creates presentation slides

To install the full claude-mem service:
```bash
npm install -g claude-mem
# or follow Docker setup at https://github.com/thedotmack/claude-mem
```

---

## Conflicts Resolved

| Conflict | Resolution |
|----------|------------|
| `seo-audit` in both `claude-seo` and `marketingskills` | Kept `claude-seo` version (more comprehensive multi-subagent audit); `marketingskills` version skipped |

---

## Notes

- The `.gitkeep` placeholder in `.claude/skills/` was removed after real skills were installed.
- All skills were fetched via `git clone --depth 1` directly from the upstream repos.
- No skills were modified from their original source — exact copies only.
- No npm packages were installed into this template repo. Skills that reference npm tools (tdd-guard, claude-mem) document their requirements above.
- Some scientific skills reference Python packages that must be installed per-project.
