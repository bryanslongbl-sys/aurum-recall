// Public-safe synthetic memories (a fictional founder) — shared by the demo lens (HTML) and the
// README poster (SVG). No real data.
const title = (n) =>
  n.replace(/^(user|feedback|project|reference)_/, "").split(/[_-]+/).filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const M = (name, type, description, body, links = [], ageDays = 12, stale = false) =>
  ({ name, title: title(name), type, description, body, links, ageDays, stale });

export const nodes = [
  M("user_who_i_am", "user", "Solo founder of Tidebank, ex-data engineer, ships daily", "Solo technical founder. Ex-data engineer. Ships daily, iterates in public. Prefers terse answers. [[feedback_terse_replies]]", ["feedback_terse_replies", "project_tidebank"]),
  M("user_timezone", "user", "Central Time; deep-work mornings, meetings after 2pm", "US Central. Guards mornings for deep work; batches meetings after 2pm.", []),
  M("user_stack_taste", "user", "Prefers TypeScript, Postgres, boring proven tools", "Likes TypeScript, Postgres, and boring proven tools over the new shiny thing. [[reference_stack_docs]]", ["reference_stack_docs"]),
  M("feedback_terse_replies", "feedback", "Wants short direct answers, no preamble", "Answer short and direct, skip the preamble.\n**Why:** reads on the phone between calls.\n**How to apply:** lead with the answer.", ["user_who_i_am"]),
  M("feedback_no_auto_deploys", "feedback", "Never deploy without an explicit go-ahead", "Never deploy to prod without an explicit 'ship it'.\n**Why:** a surprise deploy took down billing once.\n**How to apply:** stage, show the diff, wait. [[project_tidebank]]", ["project_tidebank"]),
  M("feedback_show_tradeoffs", "feedback", "Give the honest tradeoff, not the rosy answer", "Push back with the real tradeoff instead of agreeing.\n**Why:** optimism bias burned a quarter.\n**How to apply:** name the downside first.", []),
  M("feedback_one_user_first", "feedback", "Validate one real paying user before building more", "Validate ONE paying user before adding features.\n**Why:** built 3 features nobody used.\n**How to apply:** ask 'who pays for this?' first. [[project_pricing_v2]]", ["project_pricing_v2"]),
  M("feedback_backup_first", "feedback", "Back up data before any migration", "Back up the DB before any migration, verify the backup.\n**Why:** lost a table once.\n**How to apply:** dump + row-count check.", ["project_migrations"]),
  M("project_tidebank", "project", "Cashflow app for freelancers; public beta 2026-09-01", "Cashflow forecasting for freelancers. Public beta 2026-09-01. Priority = frictionless signup. [[feedback_no_auto_deploys]] [[project_pricing_v2]]", ["feedback_no_auto_deploys", "project_pricing_v2", "project_onboarding"]),
  M("project_pricing_v2", "project", "Move from flat fee to usage tiers; test in Aug", "Reprice from flat $12 to usage tiers. A/B test in August. Watch churn. [[reference_stripe_dash]]", ["reference_stripe_dash", "project_tidebank"]),
  M("project_onboarding", "project", "Rebuild signup to first-forecast under 2 min", "Cut signup-to-first-forecast under 2 min. The activation metric. [[project_tidebank]]", ["project_tidebank"]),
  M("project_migrations", "project", "Postgres schema migrations, additive-only", "All schema changes additive (ADD COLUMN), never drop/recreate live tables.", ["feedback_backup_first"]),
  M("project_mobile_app", "project", "React Native app — parked until retention proves out", "RN app parked until web 30-day retention > 40%. Don't start early.", ["project_tidebank"], 64, true),
  M("project_ai_categorizer", "project", "Auto-categorize transactions with a small model", "Auto-categorize transactions. Trial a small local model first. [[reference_stack_docs]]", ["reference_stack_docs"]),
  M("reference_stripe_dash", "reference", "Stripe dashboard — subscription and churn state", "Subscription/payment/churn state lives in the Stripe dashboard. Keys stay in the vault.", []),
  M("reference_stack_docs", "reference", "Internal architecture notes and ADRs", "Architecture notes and decision records in the wiki. Source of truth for 'why we chose X'.", []),
  M("reference_support_inbox", "reference", "Where user pain shows up first", "Support inbox — the earliest signal of real user pain. Skim weekly. [[feedback_one_user_first]]", ["feedback_one_user_first"], 40, true),
];
