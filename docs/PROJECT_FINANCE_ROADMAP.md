# AZ-PE — Project Finance Development Specification

Branch: `chat-gpt`
Status: architecture baseline; implementation in progress.
Product name: **pending selection**. Replace the incorrect "UberFix" branding after the final name is approved.

## Core requirements

1. Separate petty/daily expenses from formal supplier invoices.
2. Preserve existing `projects`, `expenses`, `profiles` and existing receipts.
3. Supplier/vendor and subcontractor registry, unified across projects and statements per project / vendor.
4. Invoice header, detailed line items, multiple payment allocations, due date, optional tax identification and tax amounts.
5. Invoice settlement status must be **derived** from posted payment allocations: unpaid, partially paid, fully paid; cancelled is an explicit lifecycle state. Do not allow direct arbitrary paid-status editing.
6. Cost codes and approved budget lines per project. Avoid double-counting invoice commitment versus expense versus cash settlement.
7. Later: custody & settlements, mobile batch capture, extraction review queue, offline draft persistence, professional branded PDF reporting.

## Accounting semantics (non-negotiable)

- Invoice obligations arise on approved/posted invoice; payment decreases outstanding debt but does **not** create another expense.
- The first iteration records invoice totals in the invoice currency (EGP initially) and captures paid amounts independently.
- Daily outlays continue in `expenses` but must not duplicate an invoice's payment allocation.
- Draft invoices are excluded from committed/recognized costs until posting.
- Invoice balance = invoice total - sum of posted payments. Cancelled invoices are excluded from due reporting.
- Project budget spending (accrual-oriented) = approved invoice lines + independently posted daily expenses; compare against budget commitments separately.
- Do not treat 'cash received from client' as an expense.
- Existing historical expense data must remain readable; any migration backfill requires an explicit mapping and verification.

## First delivery scope

- Supplier registry with type, contacts, tax identity and specialty.
- Invoice header (project, supplier, number, invoice date, due date, notes, lifecycle state).
- Invoice item lines (description, quantity, unit rate, optional tax rate, cost code).
- Payment records (amount, date, payment reference and evidence).
- Approved project budgets and budget lines keyed by cost code.
- Read-only financial projections/statement calculations.

## Mandatory technical acceptance tests

- Invoice 100000, payment 30000 -> outstanding 70000; settlement=partially_paid.
- Further payment 70000 -> outstanding 0; settlement=paid.
- Concurrent overpayment attempts must be rejected **in the database**, not merely by the UI.
- An invoice that has payments cannot be deleted/cancelled without reversal workflow.
- Cross-tenant project, supplier, invoice, payment, and file access must be denied by database RLS.
- Supplier statement reconciles invoice totals and payment allocations by supplier and project.
- Migrating must not delete or rewrite existing expenses or receipts.
- Cost and budget aggregation counts invoice lines once; payment does not affect incurred-cost sum.
- Distinct organizational access and approval roles require a separate migration/design before production use.

## Phased execution

- Phase 1a: data model, RLS, invoice/payment integrity and vendors.
- Phase 1b: React screens, forms, supplier statements, invoice item editing, integration tests.
- Phase 1c: project budgets, cost-code assignment and actual-vs-budget reports.
- Phase 1d: mobile batch uploads, extraction queue (with confidence and human confirmation), offline draft sync, branded PDF.
- Later: custody ledger, supplier settlement reconciliation, accounting ERP integrations.

## Existing code hotspots

- `src/App.tsx`: routes.
- `src/components/app-shell.tsx`: navigation and old UberFix branding.
- `src/hooks/use-data.ts`: existing project and daily-expense queries.
- `src/pages/expenses.tsx`: daily expenses and receipt lifecycle.
- `src/integrations/supabase/types.ts`: generated database types; regenerate only after database migration.
