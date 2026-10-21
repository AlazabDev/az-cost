# Az-Cost — Master Development Blueprint

**Repository:** `AlazabDev/az-cost`  
**Working branch:** `chat-gpt`  
**Scope:** Target architecture and execution plan — not a statement of deployed features.  
**Target:** Project Financial Management Platform, v1.0 and subsequent releases.  
**Status:** Architecture specification; implementation and production validation are separate activities.

## 1. Vision and boundaries

Build an Arabic-first project financial management system spanning organizations, contracts, projects, sites, day-to-day spending, supplier invoices, subcontractors, advances/custody, payments, budgets, receivables, forecasts and profitability. It specializes in project execution finance and interoperates with ERPNext and Daftra rather than replacing general-ledger accounting.

**Accounting invariant:** recognized cost, outstanding obligation, and cash paid are distinct measurements; payment of a recorded invoice must never recognize its cost a second time.

## 2. Required business outcomes

| Domain | Outcome |
| --- | --- |
| Daily expenses | Project/site-based consolidated costs and evidence |
| Supplier invoices | Invoice total, settled amount, open amount and due date |
| Suppliers | Cross-project vendor statements within access scope |
| Budgets | Approved versus actual and committed costs |
| Custody | Issued, spent, settled and outstanding cash |
| Liquidity | Forthcoming cash requirements and maturities |
| Governance | Traceable creator, reviewer, approver, status and time |
| Profitability | Reconciled project income, costs and forecast completion |
| Documents | Drill down from aggregate values to source receipt |

## 3. Architecture

- **Frontend:** React + TypeScript + Vite, Arabic RTL, desktop/mobile and progressive web app.
- **Backend:** Supabase Auth, PostgreSQL, RLS, SQL functions/RPC and Edge Functions for privileged workflows.
- **Storage:** Supabase Storage with organization/project boundaries and document metadata.
- **Integrations:** ERPNext, Daftra, OCR and PDF/Excel document service.
- **Authority:** Database transaction and server-side authorization are decisive for posting, approving, allocating payments, voiding and settlement. Client-side validation is only a user-experience aid.
- **Consistency:** Transactional allocation and document posting, immutable audit trail, idempotency keys for uploads/imports/webhooks, outbox events for integration delivery.
- **Amounts:** Use exact `numeric` decimal values, explicit currency, controlled tax rounding, and currency-specific precision; never use floating-point financial arithmetic.

## 4. Domain model — target (not current database inventory)

| Domain | Main tables |
| --- | --- |
| Identity and tenancy | `organizations`, `organization_members`, `project_members` |
| Project hierarchy | `projects`, `project_sites`, `project_phases` |
| Supplier master | `vendors`, `vendor_contacts` |
| AP and invoices | `supplier_invoices`, `invoice_lines`, `credit_notes` |
| Independent expenses | `expenses`, `expense_allocations`, `expense_categories` |
| Cash and payment | `payments`, `payment_allocations`, `cash_accounts` |
| Custody | `custodies`, `custody_movements`, `custody_settlements` |
| Budget control | `cost_codes`, `project_budgets`, `budget_lines`, `budget_revisions` |
| Procurement and subs | `purchase_orders`, `goods_receipts`, `subcontracts`, `progress_valuations` |
| Evidence and extraction | `documents`, `document_batches`, `document_extractions` |
| Governance/integration | `approval_requests`, `audit_events`, `integration_outbox` |

Preserve existing `profiles`, `projects`, `expenses` and historic receipts. Add new structures through additive, reversible or compensatable schema changes and documented backfills. Do not identify a committed migration as deployed without checking the remote migration ledger.

### Critical relationships

- Tenant/organization ownership is explicit and validated across all foreign keys and RLS access paths.
- Invoice header + lines carry supplier, project, tax, due date, lifecycle, source document, optional unique external identity.
- Allocations connect actual posted payments to payable invoices; a payment can cover multiple invoices and an invoice may receive multiple payments.
- Every expense allocation carries project and cost code; allocations reconcile to their parent entry total.
- Purchase commitments, received goods, approved invoices and cash payments are separately reported to prevent double counting.
- Income/cash received from the owner is not an expense or a supplier settlement.

### Financial views and integrity

- **Invoice outstanding** = posted invoice total minus valid posted payment allocations minus applicable credits (with explicit rules for reversals and withholding).
- **Invoice payment state** is derived: unpaid / partially_paid / fully_paid; cancellation and reversal are independent lifecycle concepts.
- **Actual incurred cost** = posted eligible invoice lines + independent posted daily expenses + eligible subcontract accruals, each recognized once and classified by cost code.
- **Committed cost** includes unfulfilled approved purchase orders/subcontracts without counting the same invoiced portion twice.
- **Cash movement** comes from posted disbursement/receipt ledger, not invoices alone.
- Posted records are reversed by compensating entries, not silently overwritten or hard deleted.
- Concurrent payments must lock affected balances inside one database transaction, reject over-allocation, and provide repeat-safe idempotency semantics.

## 5. Workflow specifications

**Supplier invoice:** upload > extraction draft > user correction/line review > review > approval > posting > payable recognized > partial/full payment allocation > balance reconciled.

**Field expense:** quick entry > project/site > cost category > receipt > review > posting. Expenses funded from custody must reference their custody settlement and may not independently duplicate a supplier invoice.

**Custody:** cash issue > expenditure + documents > settlement request > validation > approval > clear remainder or carry-forward > close.

Every state transition records actor, timestamp, former/new state, amount changes, object reference and correlation key in an access-controlled audit log.

## 6. Application navigation

1. Executive dashboard
2. Projects
3. Expense center
4. Supplier invoices and claims
5. Suppliers and subcontractors
6. Payments and cash accounts
7. Custody and settlements
8. Budgeting and cost codes
9. Contracts and procurement
10. Documents and archive
11. Financial reports
12. Organization settings and permissions

Each project has financial summary, expenses, invoices, budget, suppliers, receivables, attachments and activity views.

## 7. Delivery phases and gates

| Phase | Scope | Completion gate |
| --- | --- | --- |
| 00 | Repository/build, existing schema and data inventory, auth/RLS audit, migration ledger, CI | Lint/test/build run, baseline snapshot, relational checks documented |
| 01 | Supplier registry, itemized invoices, taxes, credits, maturity, partial payments, vendor statements | Reconciled payable and supplier balances, DB-level overpayment prevention |
| 02 | Engineering cost codes, shared-cost allocation, approved budgets, actual/committed/forecast cost | No duplicated expense on invoice payment, audited cost aggregation |
| 03 | Custody/settlements, batch photo capture, Excel imports, OCR review, offline drafts | Correct settlements, retry-safe import and sync |
| 04 | Purchase orders, goods receiving, subcontracts, certified valuations, retention | Purchases, progress and outstanding commitments reconcile |
| 05 | Contract revenues, client claims, cash-flow forecasts, cost-to-complete, PDF/Excel | Reproducible executive reports tie to transaction/document sources |
| 06 | ERPNext/Daftra adapters, organization permissions, instrumentation, performance, restore and release | End-to-end tests, access isolation, restore drill and release checklist |

**Versioning:** v1.0 is considered released only once the full acceptance gates declared below are met; intermediate deploys are development or preview releases.

## 8. Roles and permissions

| Role | Allowed scope |
| --- | --- |
| System administrator | Tenant/users/configuration (not unilateral business approval unless specifically delegated) |
| Finance manager | Budget and financial approvals within delegation limits |
| Project manager | Project approvals within allocated permission limits |
| Project accountant | Record invoices, payments and reconciliations; submit for approval |
| Site supervisor | Capture field expenses and receipt evidence |
| Auditor | Read permitted statements and immutable audit history |

Enforce membership in both organization and project where appropriate. Apply least privilege via RLS, protected database functions and service-role isolation. Approval policies enforce maker-checker separation and threshold limits.

## 9. v1.0 acceptance suite

- Field spending records can be linked to project, cost code and document.
- Multi-line supplier invoice totals, taxable components and rounding reconcile.
- Multiple partial payments produce correct outstanding balance and payment status.
- Parallel payment attempts cannot overpay an invoice at the database boundary.
- Vendor statement covers all and only authorized projects.
- Custody issue, spending, return and settlement balances reconcile.
- Approved project budget can be compared to actual and committed spending.
- Arabic PDF and Excel financial outputs tie back to source transactions and attachments.
- All organization/project boundaries are enforced by RLS, including document storage.
- Paying an already-posted invoice does not add incurred cost.
- Historical `profiles`, `projects`, `expenses` and existing evidence remain accessible after migration.
- Automated tests, migration checks, CI, runtime smoke tests, restore drill and release checklist pass.

## 10. Known state and audit limitations (as described, not freshly verified here)

- Repository and active development branch exist.
- README and Git workflow documentation exist.
- Existing `profiles`, `projects`, `expenses` are reported.
- New financial SQL migration is reported committed but not yet applied; independently verify before using.
- New invoice UI, custody, budgets and production v1.0 acceptance are not asserted as complete.
- README/DEVELOPMENT references to `az-pe`, stale package metadata/branding and actual repo identity `az-cost` require a separate deliberate cleanup and verification.

## 11. Execution discipline

1. Inventory the current Git revision and remote schema, including migrations, RLS, policies, functions, triggers and test fixtures.
2. Record observed differences between code and database, and establish a legacy-data baseline.
3. Implement phase-00 correctness checks and migration safety first; never apply undocumented destructive changes to live data.
4. Develop each phase in scoped commits/PRs with SQL migration, generated types, server constraints, UI, tests and documentation together.
5. Validate source-to-ledger-to-report reconciliations and permissions before promotion.
6. Retain operational continuity while evolving this blueprint; update the document when approved architecture changes.

**Canonical distinction:** design target ≠ committed implementation ≠ deployed database ≠ verified production functionality.
