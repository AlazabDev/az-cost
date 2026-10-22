# Roadmap

## Current request
- [ ] Add photo-first field receipt capture with batch selection and individual review before saving.
- [ ] Verify receipt validation and upload failure cleanup; check the capture screen on desktop and phone.

## Previous delivery (verification outstanding)

- [ ] Fix backend connection (rebind secrets — .env points to stale ref).
- [ ] Create database schema: profiles, projects, expenses + RLS + grants.
- [ ] Create receipts storage bucket + storage RLS policies.
- [ ] Enable email auth + Google provider.
- [ ] Build Arabic RTL UI: auth page, dashboard, projects, expenses, reports (CSV/PDF export).
- [ ] Verify end-to-end: sign in, create project, add expense with receipt; run build, typecheck, tests, security scan.
