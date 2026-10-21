-- Financial foundation for the existing single-owner-per-project schema.
-- Apply on staging first. Does not modify existing expense records.
BEGIN;

-- Existing projects need a composite unique key for cross-owner foreign keys.
CREATE UNIQUE INDEX IF NOT EXISTS finance_projects_id_user_idx ON public.projects (id,user_id);

CREATE TABLE IF NOT EXISTS public.finance_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  kind text NOT NULL DEFAULT 'supplier' CHECK (kind IN ('supplier','subcontractor','both')),
  specialty text,
  phone text,
  email text,
  tax_number text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.finance_cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  code text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code),
  UNIQUE (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  project_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  invoice_number text,
  invoice_date date NOT NULL,
  due_date date,
  tax_number text,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','posted','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_invoice_project_owner_fk
    FOREIGN KEY (project_id,user_id) REFERENCES public.projects(id,user_id),
  CONSTRAINT finance_invoice_vendor_owner_fk
    FOREIGN KEY (vendor_id,user_id) REFERENCES public.finance_vendors(id,user_id),
  CONSTRAINT finance_invoice_date_check CHECK (due_date IS NULL OR due_date >= invoice_date),
  UNIQUE (id,user_id)
);

CREATE TABLE IF NOT EXISTS public.finance_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  invoice_id uuid NOT NULL,
  cost_code_id uuid,
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,4) NOT NULL CHECK (unit_price >= 0),
  tax_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (invoice_id,user_id) REFERENCES public.finance_invoices(id,user_id) ON DELETE RESTRICT,
  FOREIGN KEY (cost_code_id,user_id) REFERENCES public.finance_cost_codes(id,user_id)
);

CREATE TABLE IF NOT EXISTS public.finance_invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  invoice_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL,
  reference text,
  receipt_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (invoice_id,user_id) REFERENCES public.finance_invoices(id,user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.finance_project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  project_id uuid NOT NULL,
  name text NOT NULL,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','approved','superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id,user_id) REFERENCES public.projects(id,user_id),
  UNIQUE (id,user_id)
);

CREATE TABLE IF NOT EXISTS public.finance_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  budget_id uuid NOT NULL,
  cost_code_id uuid NOT NULL,
  planned_amount numeric(18,2) NOT NULL CHECK (planned_amount >= 0),
  FOREIGN KEY (budget_id,user_id) REFERENCES public.finance_project_budgets(id,user_id) ON DELETE CASCADE,
  FOREIGN KEY (cost_code_id,user_id) REFERENCES public.finance_cost_codes(id,user_id),
  UNIQUE (budget_id,cost_code_id)
);

CREATE INDEX IF NOT EXISTS finance_invoices_project_idx ON public.finance_invoices(project_id,invoice_date);
CREATE INDEX IF NOT EXISTS finance_invoices_vendor_idx ON public.finance_invoices(vendor_id,invoice_date);
CREATE INDEX IF NOT EXISTS finance_payments_invoice_idx ON public.finance_invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS finance_items_invoice_idx ON public.finance_invoice_items(invoice_id);

-- Enforce strict ownership at the database boundary; no service key is exposed to the app.
ALTER TABLE public.finance_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_owner ON public.finance_vendors FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY code_owner ON public.finance_cost_codes FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY invoice_owner ON public.finance_invoices FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY item_owner ON public.finance_invoice_items FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY payment_owner ON public.finance_invoice_payments FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY budget_owner ON public.finance_project_budgets FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY budget_line_owner ON public.finance_budget_lines FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Backend guard: invoice lines cannot change once posted; paid invoices cannot be cancelled.
CREATE OR REPLACE FUNCTION public.finance_guard_invoice_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state <> 'draft' THEN
      RAISE EXCEPTION 'Only draft invoices can be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.state = 'posted' AND (
    NEW.project_id IS DISTINCT FROM OLD.project_id OR
    NEW.vendor_id IS DISTINCT FROM OLD.vendor_id OR
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.invoice_date IS DISTINCT FROM OLD.invoice_date OR
    NEW.state = 'draft'
  ) THEN RAISE EXCEPTION 'Cannot rewrite a posted invoice'; END IF;
  IF NEW.state = 'posted' AND OLD.state = 'draft' AND NOT EXISTS
    (SELECT 1 FROM public.finance_invoice_items WHERE invoice_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot post invoice with no line items';
  END IF;
  IF NEW.state = 'cancelled' AND OLD.state <> 'cancelled' AND
      EXISTS (SELECT 1 FROM public.finance_invoice_payments WHERE invoice_id = OLD.id) THEN
    RAISE EXCEPTION 'Reverse payments before cancelling an invoice';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER finance_invoice_guard BEFORE UPDATE OR DELETE ON public.finance_invoices
FOR EACH ROW EXECUTE FUNCTION public.finance_guard_invoice_changes();

CREATE OR REPLACE FUNCTION public.finance_guard_invoice_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_state text;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.invoice_id <> OLD.invoice_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'Cannot move an invoice line between invoices';
  END IF;
  SELECT state INTO v_state FROM public.finance_invoices
   WHERE id = COALESCE(NEW.invoice_id,OLD.invoice_id) FOR UPDATE;
  IF v_state IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Invoice lines may only change while draft';
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER finance_item_guard BEFORE INSERT OR UPDATE OR DELETE ON public.finance_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.finance_guard_invoice_item();

-- Serializes per-invoice payment insertion to reject concurrent overpayments.
CREATE OR REPLACE FUNCTION public.finance_validate_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_state text; v_total numeric(18,2); v_paid numeric(18,2);
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.invoice_id <> OLD.invoice_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'Payment ownership and invoice allocation are immutable';
  END IF;
  SELECT state INTO v_state FROM public.finance_invoices
  WHERE id=NEW.invoice_id FOR UPDATE;
  IF v_state IS DISTINCT FROM 'posted' THEN
    RAISE EXCEPTION 'Payment requires a posted invoice';
  END IF;
  SELECT COALESCE(round(sum(quantity*unit_price*(1+tax_rate/100)),2),0)
    INTO v_total FROM public.finance_invoice_items WHERE invoice_id=NEW.invoice_id;
  SELECT COALESCE(sum(amount),0) INTO v_paid
    FROM public.finance_invoice_payments
    WHERE invoice_id=NEW.invoice_id AND id IS DISTINCT FROM NEW.id;
  IF v_total <= 0 OR v_paid + NEW.amount > v_total THEN
    RAISE EXCEPTION 'Payment exceeds invoice outstanding balance';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER finance_payment_guard BEFORE INSERT OR UPDATE ON public.finance_invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.finance_validate_payment();

-- Payment and invoice-line totals are derived, never manually overwritten.
CREATE OR REPLACE VIEW public.finance_invoice_balances
WITH (security_invoker = true) AS
SELECT i.id AS invoice_id,i.user_id,i.project_id,i.vendor_id,i.invoice_number,
  i.invoice_date,i.due_date,i.state,
  COALESCE((SELECT round(sum(x.quantity*x.unit_price*(1+x.tax_rate/100)),2)
    FROM public.finance_invoice_items x WHERE x.invoice_id=i.id),0)::numeric(18,2) AS invoice_total,
  COALESCE((SELECT sum(p.amount)
    FROM public.finance_invoice_payments p WHERE p.invoice_id=i.id),0)::numeric(18,2) AS amount_paid
FROM public.finance_invoices i;

COMMIT;
