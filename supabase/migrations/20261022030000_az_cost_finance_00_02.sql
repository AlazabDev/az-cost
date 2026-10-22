-- Az-Cost phases 00-02; additive schema, preserve existing profiles/projects/expenses.
-- Requires review and staging tests before applying to az-cost-db.
create table public.vendors (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 name text not null check(length(trim(name))>0),
 created_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table public.cost_codes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 code text not null,
 name text not null,
 created_at timestamptz not null default now(),
 unique(owner_id,code),
 unique(id,owner_id)
);
create table public.supplier_invoices (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 project_id uuid not null references public.projects(id) on delete restrict,
 vendor_id uuid not null,
 invoice_number text not null,
 state text not null default 'draft' check(state in ('draft','posted')),
 total numeric(18,2) not null default 0 check(total>=0),
 posted_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key (vendor_id,owner_id) references public.vendors(id,owner_id),
 unique(id,owner_id), unique(owner_id,vendor_id,invoice_number)
);
create table public.invoice_lines (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 invoice_id uuid not null,
 description text not null,
 quantity numeric(18,4) not null check(quantity>0),
 unit_price numeric(18,4) not null check(unit_price>=0),
 tax_rate numeric(7,4) not null default 0 check(tax_rate between 0 and 100),
 line_total numeric(18,2) generated always as (round(round(quantity*unit_price,2)*(1+tax_rate/100),2)) stored,
 foreign key(invoice_id,owner_id) references public.supplier_invoices(id,owner_id) on delete restrict
);
create table public.payments (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 invoice_id uuid not null,
 amount numeric(18,2) not null check(amount>0),
 idempotency_key text,
 created_at timestamptz not null default now(),
 foreign key(invoice_id,owner_id) references public.supplier_invoices(id,owner_id) on delete restrict
);
create unique index payments_idempotency on public.payments(owner_id,idempotency_key) where idempotency_key is not null;
create table public.project_budgets (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 project_id uuid not null references public.projects(id) on delete restrict,
 title text not null,
 state text not null default 'draft' check(state in ('draft','approved')),
 created_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table public.budget_lines (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 budget_id uuid not null,
 cost_code_id uuid not null,
 amount numeric(18,2) not null check(amount>=0),
 foreign key(budget_id,owner_id) references public.project_budgets(id,owner_id) on delete restrict,
 foreign key(cost_code_id,owner_id) references public.cost_codes(id,owner_id),
 unique(budget_id,cost_code_id)
);
create function public.az_cost_owned_project(p_project uuid,p_owner uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.projects p where p.id=p_project and p.user_id=p_owner and p_owner=(select auth.uid()))
$$;
create function public.az_cost_owned_invoice(p_invoice uuid,p_owner uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.supplier_invoices i where i.id=p_invoice and i.owner_id=p_owner and public.az_cost_owned_project(i.project_id,p_owner))
$$;
create function public.az_cost_owned_budget(p_budget uuid,p_owner uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.project_budgets b where b.id=p_budget and b.owner_id=p_owner and public.az_cost_owned_project(b.project_id,p_owner))
$$;
alter table public.vendors enable row level security;
alter table public.cost_codes enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.project_budgets enable row level security;
alter table public.budget_lines enable row level security;
create policy vendors_access on public.vendors for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy codes_access on public.cost_codes for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy invoices_access on public.supplier_invoices for all to authenticated
 using(public.az_cost_owned_project(project_id,owner_id)) with check(public.az_cost_owned_project(project_id,owner_id));
create policy lines_access on public.invoice_lines for all to authenticated
 using(public.az_cost_owned_invoice(invoice_id,owner_id)) with check(public.az_cost_owned_invoice(invoice_id,owner_id));
create policy payments_select on public.payments for select to authenticated using(public.az_cost_owned_invoice(invoice_id,owner_id));
create policy budgets_access on public.project_budgets for all to authenticated
 using(public.az_cost_owned_project(project_id,owner_id)) with check(public.az_cost_owned_project(project_id,owner_id));
create policy budget_lines_access on public.budget_lines for all to authenticated
 using(public.az_cost_owned_budget(budget_id,owner_id)) with check(public.az_cost_owned_budget(budget_id,owner_id));
-- Prevent draft/posted invoice lines from diverging.
create function public.az_cost_guard_invoice()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.state='posted' then raise exception 'Posted invoice cannot be deleted'; end if;
  return old;
 end if;
 if old.state='posted' then raise exception 'Posted invoice is immutable'; end if;
 if new.project_id is distinct from old.project_id or new.owner_id is distinct from old.owner_id or new.vendor_id is distinct from old.vendor_id then
  if exists(select 1 from public.invoice_lines where invoice_id=old.id) then raise exception 'Invoice owner/project/vendor locked after lines'; end if;
 end if;
 new.total=(select coalesce(sum(line_total),0) from public.invoice_lines where invoice_id=old.id);
 if new.state='posted' then
  if not exists(select 1 from public.invoice_lines where invoice_id=old.id) then raise exception 'Cannot post invoice without lines'; end if;
  new.posted_at=now();
 else new.posted_at=null; end if;
 return new;
end $$;
create trigger guard_invoice before update or delete on public.supplier_invoices for each row execute function public.az_cost_guard_invoice();
create function public.az_cost_guard_line()
returns trigger language plpgsql set search_path='' as $$
declare invoice_state text;
begin
 if tg_op='DELETE' then
  select state into invoice_state from public.supplier_invoices where id=old.invoice_id for update;
  if invoice_state<>'draft' then raise exception 'Only draft lines can change'; end if;
  return old;
 end if;
 select state into invoice_state from public.supplier_invoices where id=new.invoice_id for update;
 if invoice_state<>'draft' then raise exception 'Only draft lines can change'; end if;
 if tg_op='UPDATE' and new.invoice_id is distinct from old.invoice_id then
  select state into invoice_state from public.supplier_invoices where id=old.invoice_id;
  if invoice_state<>'draft' then raise exception 'Posted line immutable'; end if;
 end if;
 return new;
end $$;
create trigger guard_line before insert or update or delete on public.invoice_lines for each row execute function public.az_cost_guard_line();
create function public.az_cost_guard_budget()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.state='approved' then raise exception 'Approved budget cannot be deleted'; end if;
  return old;
 end if;
 if old.state='approved' then raise exception 'Approved budget is immutable'; end if;
 return new;
end $$;
create trigger guard_budget before update or delete on public.project_budgets for each row execute function public.az_cost_guard_budget();
create function public.az_cost_guard_budget_line()
returns trigger language plpgsql set search_path='' as $$
declare s text;
begin
 if tg_op='DELETE' then
  select state into s from public.project_budgets where id=old.budget_id for update;
  if s<>'draft' then raise exception 'Approved budget immutable'; end if;
  return old;
 end if;
 select state into s from public.project_budgets where id=new.budget_id for update;
 if s<>'draft' then raise exception 'Approved budget immutable'; end if;
 if tg_op='UPDATE' and new.budget_id is distinct from old.budget_id then
  select state into s from public.project_budgets where id=old.budget_id;
  if s<>'draft' then raise exception 'Approved budget immutable'; end if;
 end if;
 return new;
end $$;
create trigger guard_budget_line before insert or update or delete on public.budget_lines for each row execute function public.az_cost_guard_budget_line();
-- Transactional payment entry: serializes on invoice row and rejects concurrent overpayment.
create function public.az_cost_pay_invoice(p_invoice uuid,p_amount numeric,p_idempotency_key text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.supplier_invoices%rowtype; already numeric; existing public.payments%rowtype; result_id uuid;
begin
 if (select auth.uid()) is null or p_amount is null or p_amount<=0 or round(p_amount,2)<>p_amount then raise exception 'Invalid payment'; end if;
 select * into inv from public.supplier_invoices where id=p_invoice for update;
 if not found or inv.state<>'posted' or not public.az_cost_owned_project(inv.project_id,inv.owner_id) then raise exception 'Invoice unavailable'; end if;
 if p_idempotency_key is not null then
  select * into existing from public.payments where owner_id=inv.owner_id and idempotency_key=p_idempotency_key;
  if found then
   if existing.invoice_id=p_invoice and existing.amount=p_amount then return existing.id; end if;
   raise exception 'Idempotency conflict';
  end if;
 end if;
 select coalesce(sum(amount),0) into already from public.payments where invoice_id=p_invoice;
 if already+p_amount>inv.total then raise exception 'Payment exceeds outstanding balance'; end if;
 insert into public.payments(owner_id,invoice_id,amount,idempotency_key) values(inv.owner_id,p_invoice,p_amount,p_idempotency_key) returning id into result_id;
 return result_id;
end $$;
revoke all on function public.az_cost_pay_invoice(uuid,numeric,text) from public,anon;
grant execute on function public.az_cost_pay_invoice(uuid,numeric,text) to authenticated;
grant select,insert,update,delete on public.vendors,public.cost_codes,public.supplier_invoices,public.invoice_lines,public.project_budgets,public.budget_lines to authenticated;
grant select on public.payments to authenticated;
revoke insert,update,delete on public.payments from authenticated,anon;
create view public.az_cost_invoice_balances with (security_invoker=true) as
 select i.id,i.owner_id,i.project_id,i.vendor_id,i.invoice_number,i.state,i.total,
 coalesce(x.paid,0) paid,i.total-coalesce(x.paid,0) outstanding,
 case when coalesce(x.paid,0)=0 then 'unpaid' when coalesce(x.paid,0)<i.total then 'partially_paid' else 'paid' end payment_status
 from public.supplier_invoices i
 left join (select invoice_id,sum(amount) paid from public.payments group by invoice_id) x on x.invoice_id=i.id
 where i.state='posted';
grant select on public.az_cost_invoice_balances to authenticated;
create view public.az_cost_project_actuals with (security_invoker=true) as
 select p.id project_id,p.user_id owner_id,
 coalesce((select sum(e.amount) from public.expenses e where e.project_id=p.id and e.direction='expense'),0) legacy_expenses,
 coalesce((select sum(i.total) from public.supplier_invoices i where i.project_id=p.id and i.state='posted'),0) posted_invoices
 from public.projects p;
grant select on public.az_cost_project_actuals to authenticated;
