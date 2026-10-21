# Developer guide — AZ-PE

## Checkout

```bash
git clone https://github.com/AlazabDev/az-pe.git
cd az-pe
git fetch origin
git switch chat-gpt
npm ci
npm run dev
```

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Authentication gate and routes |
| `src/pages/` | Screens: dashboard, projects, expenses, reports |
| `src/hooks/use-data.ts` | Reads existing project/expense data |
| `src/integrations/supabase/` | Supabase client and generated types |
| `supabase/migrations/` | Versioned SQL changes |
| `docs/PROJECT_FINANCE_ROADMAP.md` | Financial specification and acceptance tests |

## Git and review

```bash
git switch chat-gpt
git pull --ff-only origin chat-gpt
git switch -c feat/your-feature
# Make and verify changes
git add .
git commit -m "feat: implement scoped change"
git push -u origin feat/your-feature
```

Create a PR to the integration branch; prepare a reviewed PR from `chat-gpt` to `main` when releasing. Repo-level branch protection must be configured in GitHub Settings, as committed workflow files cannot enforce server-side protection by themselves.

## Verification

```bash
npm run lint
npm test
npm run build
```

## Supabase workflow

Supabase target `az-pe-db` has project reference `nnzqptnnrawzhcfzoinn`. Migrations in the repository are source artifacts; apply separately using the Supabase migration tools. Verify the existing schema, foreign keys and policies, then apply additive migrations and regenerate `src/integrations/supabase/types.ts`. Test payments for partial balances and concurrency, multi-user isolation, and legacy-expense compatibility before considering deployment complete.

## Release checklist

1. All CI checks green and reviewer confirms scope.
2. Database migration tested, applied, and schema/types synchronized.
3. Core financial invariants and historical data integrity verified.
4. Application build and runtime smoke tests pass.
5. Version/tag and change log updated at release time.
