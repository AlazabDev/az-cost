# Contributing to AZ-PE

## Workflow

Develop on a dedicated branch; `chat-gpt` is the current integration/development branch. Keep commits narrowly scoped, with accurate conventional-commit messages. Do not push unfinished features into `main`.

## Local quality gate

Run `npm ci`, `npm run lint`, `npm test`, and `npm run build` before proposing a merge. Write targeted tests for changes to invoices, allocations, budgets, and financial summaries.

## Database changes

Use additive, timestamped SQL migrations in `supabase/migrations/`. Do not manually modify generated Supabase types unless regeneration is unavailable and clearly explained. Prefer RLS and database constraints for tenant isolation and payment limits. Never treat a browser check as an authorization boundary.

## Financial invariants

- Invoice totals derive from line items; payment totals derive from payment allocations.
- Paying a supplier invoice does not create a second expense.
- Refunds and reversals must have an explicit, traceable workflow.
- Never overwrite approved financial documents without recording a correction.
- Respect the existing `projects`, `expenses`, `profiles` and receipt files.

## Language and design

Arabic-first, right-to-left layouts. Product branding is awaiting final approval; do not propagate the old UberFix label into new features.
