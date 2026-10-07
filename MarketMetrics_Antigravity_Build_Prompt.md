---
title: MarketMetrics — Antigravity Build Prompt (Demo-Ready From Day One)
type: agent-prompt
tags: [mapreduce, emr, retail-analytics, antigravity, project-build, live-demo]
---

# MarketMetrics — Build Prompt for Antigravity

> [!info] How this differs from the LogSense sequence
> Last time, live streaming, real branding, and professional polish were all bolted on as separate follow-up prompts after the fact — because those gaps only became obvious once the basic version existed. This prompt bakes all of that in from Phase 0, since we now know what a demo actually needs. It's one long sequence, but still phase-by-phase: stop after each phase, review, then continue. The very last phase is explicitly a "what if the live demo can't happen" fallback, since you asked for both.

---

## The Prompt

```
You are building "MarketMetrics: Distributed Retail Sales Analysis Using
AWS EMR and S3" — a real, runnable local implementation of the pipeline
described below, built end-to-end to be shown live or, if that's not
possible on demo day, captured as a clean set of screenshots.

SOURCE ABSTRACT (what this must faithfully represent)
Retail point-of-sale systems export daily transaction logs to a private S3
bucket. New data triggers an S3 event routed through EventBridge, which
provisions a transient EMR cluster. A MapReduce job maps raw transactions
to product category, timestamp, and regional revenue, then reduces these
into total sales, profit margins, and top-performing locations. Results are
written back to S3 and the cluster terminates automatically. A web
dashboard shows job execution tracking, interactive visualizations of the
processed metrics, and a secure file management interface for the
resulting reports. Security is via least-privilege IAM roles, S3
server-side encryption, and lifecycle policies archiving old data to
Glacier.

GLOBAL RULES FOR THIS BUILD
1. Work in PHASES, in order. After each phase: stop, summarize what was
   built, show how to verify it, and wait for me to say "continue."
2. Maintain one running file, docs/PROCESS_LOG.md, in Obsidian-friendly
   format (YAML frontmatter, `##` per phase, `> [!note]` / `> [!decision]`
   / `> [!issue]` callouts, a Mermaid architecture diagram kept current).
   Update it as you finish each phase, not after I approve.
3. Prefer real, working local equivalents of the AWS services over pure
   mocks — e.g. attempt LocalStack (Docker) for S3 and EventBridge before
   falling back to a simulated equivalent. Whichever you use, log the
   decision and, if you fall back, log exactly why and what the honest gap
   to production is (this project already has a track record of this kind
   of fallback being the right call — don't be afraid to make it again if
   Docker isn't available, just document it clearly).
4. Nothing in this build should read as a prototype by the end: every
   phase from the UI phase onward is expected to use a real, deliberate
   design system, not placeholder styling to be "fixed later."

═══════════════════════════════════════════════════════════════
PHASE 0 — Project Scaffolding & Documentation Setup
═══════════════════════════════════════════════════════════════
- Create the project root: /data (sample transactions), /pipeline (mapper/
  reducer + orchestration), /infra (LocalStack/Docker config), /backend,
  /frontend, /docs, /tests.
- Initialize docs/PROCESS_LOG.md with frontmatter, a Mermaid diagram
  placeholder, and this project's abstract pasted in as context at the top.
- Initialize git. Stop and show the folder tree.

═══════════════════════════════════════════════════════════════
PHASE 1 — Local AWS Equivalent (S3 + EventBridge + transient "EMR")
═══════════════════════════════════════════════════════════════
- Attempt LocalStack via Docker for an S3-compatible bucket and an
  EventBridge-compatible event bus. If Docker is unavailable, build the
  closest honest local equivalent: a local object-store directory standing
  in for the S3 bucket, and a simple pub/sub or filesystem-watcher standing
  in for EventBridge — document this explicitly as a simplification either
  way.
- Model the "transient EMR cluster" as a real process lifecycle even if
  simulated: a job runner that is explicitly "provisioned" (started),
  "runs" the MapReduce job, writes results, then is explicitly "terminated"
  (the process/container actually stops) — not a function call pretending
  to be a cluster. This matters later: Phase 6's dashboard needs a real
  lifecycle to visualize, not a fake one.
- Stop and demonstrate: drop a file into the bucket location, show the
  event fire, show a cluster "spin up."

═══════════════════════════════════════════════════════════════
PHASE 2 — Sample Retail Transaction Dataset
═══════════════════════════════════════════════════════════════
- Generate a realistic synthetic POS transaction dataset: transaction ID,
  timestamp, store region (use 5–8 named regions), product category
  (8–10 categories), item cost, sale price, quantity — at least 150k rows,
  covering a simulated 90-day window.
- Bake in patterns that make the eventual dashboard genuinely interesting
  to look at: weekday/weekend variation, a seasonal upward trend, one
  clearly top-performing region, one clearly underperforming region, and
  a deliberate short-lived promotional spike in one category (this is your
  "interesting insight" for the demo — something a viewer can actually
  notice on a chart, not just uniform random noise).
- Log the data dictionary and the intentional patterns (so you can find
  them again later when validating the reducer output). Upload the sample
  dataset to the Phase 1 bucket. Stop and show sample rows.

═══════════════════════════════════════════════════════════════
PHASE 3 — Mapper / Reducer: Core Retail Aggregation
═══════════════════════════════════════════════════════════════
- Implement the mapper: parse each transaction, emit key-value pairs
  keyed by (region, category, date) with revenue and cost.
- Implement the reducer: aggregate into total sales per region, total
  sales per category, profit margin (%) per region and per category, and
  a ranked list of top-performing regions.
- Run it through the Phase 1 pipeline (not a local dry run) end to end:
  bucket → event → cluster lifecycle → mapper → reducer → results written
  back to the bucket → cluster terminated.
- Validate against the intentional patterns from Phase 2 (does the known
  top region actually rank first? does the promo spike show up in that
  category's numbers for that window?). Log the validation.
- Stop and show the aggregated output plus the validation check.

═══════════════════════════════════════════════════════════════
PHASE 4 — Time-Series & Trend Aggregation
═══════════════════════════════════════════════════════════════
- Add a second reducer pass producing daily/weekly sales trend series per
  region and per category (needed for the trend charts in Phase 6, and to
  make the promo spike visually obvious).
- Add a simple forecast: a naive but real projection (e.g. moving average
  or linear trend) for next-period sales per region — the abstract
  promises "inventory forecasts," so this needs to actually exist, even in
  a simple form; document its method and limitations honestly.
- Stop and show the trend data plus the forecast for one region.

═══════════════════════════════════════════════════════════════
PHASE 5 — Security Pass
═══════════════════════════════════════════════════════════════
- Simulate least-privilege IAM: distinct local "roles" for the job runner
  (read raw data, write results only) vs. the dashboard backend (read
  results only, no raw data access) — enforced in code, not just named.
- Simulate S3 server-side encryption at rest for stored files (or use it
  for real if LocalStack supports it) and a lifecycle rule that moves
  transaction data older than N days to a separate "archive" (Glacier
  stand-in) location.
- Require an API key or basic auth on the backend.
- Log what real AWS IAM policies, KMS encryption, and Glacier lifecycle
  rules would add beyond this local approximation.
- Stop.

═══════════════════════════════════════════════════════════════
PHASE 6 — Backend API
═══════════════════════════════════════════════════════════════
- Build an API (Flask or Node — pick one, justify it) exposing: current
  aggregated metrics, trend series, forecasts, top regions/categories, a
  job-status/lifecycle endpoint reflecting the real Phase 1 cluster
  lifecycle state (provisioning/running/writing-results/terminated), a
  file-listing endpoint for the "secure file management" feature (backed
  by the real Phase 1 bucket), and an endpoint to trigger a fresh pipeline
  run (new synthetic day's data → full lifecycle → new results).
- Push job-lifecycle state changes to the frontend live (WebSocket or SSE)
  rather than having the frontend poll — this is what will make Phase 8's
  demo trigger actually watchable in real time instead of "click and wait."
- Stop and show example responses for each endpoint, and the lifecycle
  events firing in order when a job is triggered.

═══════════════════════════════════════════════════════════════
PHASE 7 — Design System & Dashboard UI (built right the first time)
═══════════════════════════════════════════════════════════════
This is a retail business-intelligence dashboard for analysts and
executives — not a security operations center — so it should read as
confident and editorial, not alarm-heavy. Write a short design plan in
PROCESS_LOG.md before coding, covering:

- Palette (name each token, give hex values, state its role): a warm,
  neutral base surface rather than stark white or dark mode (e.g. a warm
  off-white paper tone) with a true panel-white for content areas; a deep,
  confident primary accent for growth/positive metrics (a deep emerald or
  forest green reads as "profit" without being a cliché neon-green); a
  warm gold/amber for "top performer" highlights; a muted, restrained
  brick/rust reserved narrowly for underperformance flags — not used
  decoratively elsewhere. Avoid the generic cream-background-plus-
  terracotta-accent combo specifically, and avoid an all-dark
  mode-with-one-neon-accent look — pick one deliberate direction and
  justify it for this audience.
- Typography: a confident serif for the hero KPI numbers and section
  headings (something with editorial, financial-report weight), paired
  with a clean, humanist sans for body copy and labels, and a tabular/
  monospaced face specifically for numeric tables and the file listing
  where digit alignment matters. Two or three faces total, no more.
- Layout concept (describe in a sentence, sketch in ASCII before coding):
  reject a generic identical-card grid. Consider an "executive report"
  structure — a top KPI strip with 3–4 large hero numbers (total revenue,
  overall profit margin, top region, current job status) each with a
  small sparkline; below it, the standout element: a horizontal pipeline
  stepper showing the real Phase 1/6 lifecycle live (Upload → Event →
  Cluster Provisioning → Mapping → Reducing → Results Written → Cluster
  Terminated), each step lighting up as it actually happens; below that, a
  two-column area for regional performance and category breakdown; and a
  "Reports" panel styled as a secure file browser (filenames, timestamps,
  sizes, a lock icon for encrypted status, download links) reflecting the
  real bucket contents.
- One deliberate motion moment: the pipeline stepper advancing is the
  moment worth making feel alive (a clear, specific transition as each
  stage completes); everything else (chart updates, hover states) should
  be quiet and fast. Respect prefers-reduced-motion.
- Data presentation discipline from the start (don't defer this): all
  large numbers formatted with separators/abbreviation, timestamps shown
  as relative where recency matters and absolute where a specific moment
  matters, every chart restyled to the palette above with no default
  library styling, every interactive element with hover/active/focus
  states, one consistent icon set only.

Review the plan against generic-dashboard defaults before building —state
plainly if any part of it is just a default choice and revise it. Then
build it wired to the real Phase 6 API and live lifecycle events. Take
screenshots at 1440px, 1024px, and 390px widths and sanity-check against
the plan. Stop.

═══════════════════════════════════════════════════════════════
PHASE 8 — Live Demo Trigger & Screenshot Fallback (build both now)
═══════════════════════════════════════════════════════════════
Since this may be shown live or as screenshots depending on demo-day
conditions, build for both explicitly, now, not as an afterthought:

- Add a clearly-labeled "Run new analysis" control that ingests a fresh
  synthetic day of transactions and fires the real pipeline lifecycle end
  to end, watchable live in the Phase 7 stepper (target: the full cycle
  completing within roughly 15–30 seconds so it's genuinely demoable, not
  a multi-minute wait).
- Add a deterministic "demo dataset" option (as opposed to fully random
  each time) so the same run — and the same-looking result — can be
  reproduced reliably in front of an audience or re-captured for
  screenshots without variance.
- Build a small screenshot-capture helper (a script, or documented manual
  steps) that walks through the demo dataset run and saves a clean image
  at each meaningful stage: idle dashboard, pipeline mid-run (a couple of
  different stepper states), completed results, and the reports/file
  panel — save these under /docs/screenshots/.
- Stop and produce both: a live run-through, and the full screenshot set.

═══════════════════════════════════════════════════════════════
PHASE 9 — Naming & Brand Identity
═══════════════════════════════════════════════════════════════
- Propose 3 candidate product names (the abstract's internal title,
  "MarketMetrics," is a fine candidate too — don't discard it just to be
  different) with a one-line rationale each grounded in retail analytics,
  plus a short tagline for each. Log all 3, pick one, say why.
- Design a typography-based wordmark from the Phase 7 type system (no
  generic AI-logo tropes — no gradient blob, no abstract swoosh). Export
  as SVG, derive a proper favicon set (multiple sizes + apple-touch-icon).
- Apply the name/tagline consistently: browser tab titles per view,
  favicon, README header, project metadata, and anywhere a placeholder
  name currently appears in code or config.
- Stop and show the wordmark, favicon, and where the name now appears.

═══════════════════════════════════════════════════════════════
PHASE 10 — Forensic Polish Audit
═══════════════════════════════════════════════════════════════
Before calling this done, audit it the way a genuinely finished product
would be audited — this catches what Phase 7 missed under time pressure:
- Spacing/type/shadow/radius consistency: are these coming from a small
  fixed token set, or did one-off values creep in anywhere?
- Every number formatted, every timestamp relative-or-absolute
  appropriately, every chart de-defaulted, everywhere — not just the
  panels built first.
- Every interactive control has hover, active, and visible keyboard-focus
  states.
- Real computed contrast check on the profit/underperformance signal
  colors against their backgrounds — WCAG AA at minimum.
- No leftover placeholder copy, console errors, or an unstyled native
  form element sitting next to designed ones.
- Fix whatever the audit finds. Log specific findings and specific fixes,
  not a generic "polished styling" note. Re-capture the Phase 8 screenshot
  set once fixes are in, since demo-day screenshots should reflect the
  final state, not the first pass.

Close docs/PROCESS_LOG.md with a final architecture diagram reflecting the
real built pipeline, a "Known Limitations & What Production Would Add"
section (real AWS EMR/EventBridge/IAM/Glacier vs. the local equivalents
used here), and a short "How to Demo This" section covering both the live
run-through and where to find the fallback screenshots.
```

---

## Notes on this prompt

- **Why the pipeline stepper is worth building even though it's simulated:** the abstract's actual technical center of gravity is the event-driven, transient-cluster architecture — S3 event → EventBridge → EMR spin-up → MapReduce → terminate. A dashboard that only shows the *results* of that (a bar chart) hides the most interesting engineering decision in the whole project. Making the lifecycle itself visible and live is what turns "we implemented MapReduce" into something worth watching happen.
- **Why Phase 8 exists before polish, not after:** building the live-vs-screenshot fallback early means the deterministic demo dataset and the screenshot set are exercised *before* the final polish pass, so Phase 10's re-capture is a quick refresh of something that already works, not the first time it's been tried under pressure the night before a demo.
- **Why the palette is specified now instead of left to the agent to discover the hard way:** the LogSense build needed a separate branding/polish prompt after the fact because the first pass defaulted to generic styling. Naming the audience (analysts, not SOC engineers) and giving concrete tokens up front is what a second round of "make it look professional" would have said anyway — better to spend that effort now.
