# AZ-PE — Project Finance Platform

> منصة مالية للمشروعات تركز على تجميع المصروفات والفواتير ومدفوعات الموردين، وربط التكاليف بالمشروعات والموازنات. **الاسم التجاري النهائي لم يُعتمد بعد**؛ AZ-PE هو اسم المستودع التقني.

## Overview | نظرة عامة

AZ-PE is an Arabic-first project-finance application. The current released code supports project records, daily expenses, payment-received entries, receipt photos, dashboard summaries, and CSV/print reports. A new financial foundation is under development on `chat-gpt` for supplier invoices, itemized bills, partial payments, supplier statements, and project budgets.

**Important:** New SQL migrations committed to Git are not evidence that they have been deployed to Supabase. Do not present planned functionality as live.

## Stack

- React 18, TypeScript, Vite 5
- Tailwind CSS, Radix UI, Recharts
- Supabase Auth, PostgreSQL, Storage
- Vitest and ESLint

## Get started

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/AlazabDev/az-pe.git
cd az-pe
git switch chat-gpt
npm ci
npm run dev
```

Vite development server defaults to port 8080 (`vite.config.ts`). A configured Supabase project is needed for authentication and data persistence. The current client configuration resides in `src/integrations/supabase/client.ts`; its publishable key is not a server secret.

## Checks

```bash
npm run lint
npm test
npm run build
```

These commands are wired into GitHub Actions. CI configuration alone does not establish passing status until the workflow runs successfully.

## Database

Connected Supabase project: `az-pe-db` (`nnzqptnnrawzhcfzoinn`). Existing tables: `profiles`, `projects`, `expenses` (RLS enabled at last inspection).

SQL migrations: [supabase/migrations](supabase/migrations). Apply migrations through a controlled Supabase migration workflow, validate them before production, and regenerate generated types after schema changes. Never paste privileged keys in client code.

## Repository workflow

- `main`: existing default branch; protect through GitHub Settings.
- `chat-gpt`: active development branch.
- Submit focused pull requests to `main` after checks and database compatibility review.
- Use conventional commit prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`.
- Do not commit `.env`, tokens, downloaded receipt files, `node_modules`, or build output.

## Documentation

- [Financial scope and acceptance criteria](docs/PROJECT_FINANCE_ROADMAP.md)
- [Local setup, Git flow and delivery checklist](docs/DEVELOPMENT.md)
- [Contribution rules](CONTRIBUTING.md)
- [Change history](CHANGELOG.md)

## Product boundaries

A supplier invoice records an obligation. Payment allocations reduce the outstanding balance, **not** the cost recognized on the invoice. Cash-based petty expenses are separate to prevent double counting. Project budgets and supplier statements must derive from those distinct records.

## Ownership

AlazabDev. All deployment, branding and accounting integration decisions are maintained within this repository; the legacy template README is not authoritative.
