import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
const db = supabase as unknown as SupabaseClient;
export type Vendor = { id:string; name:string };
export type Invoice = { id:string; invoice_number:string; vendor_id:string; project_id:string; total:number; state:string };
export type Balance = { id:string; outstanding:number; paid:number; payment_status:string };
export type CostCode = { id:string; code:string; name:string };
async function query<T>(p: PromiseLike<{data:T|null;error: {message:string}|null}>):Promise<T> {
 const r=await p;if(r.error) throw new Error(r.error.message);return r.data as T;
}
export const vendors=()=>query<Vendor[]>(db.from("vendors").select("id,name").order("name"));
export const invoices=()=>query<Invoice[]>(db.from("supplier_invoices").select("id,invoice_number,vendor_id,project_id,total,state").order("created_at",{ascending:false}));
export const balances=()=>query<Balance[]>(db.from("az_cost_invoice_balances").select("id,outstanding,paid,payment_status"));
export const codes=()=>query<CostCode[]>(db.from("cost_codes").select("id,code,name").order("code"));
export const addVendor=(owner_id:string,name:string)=>query(db.from("vendors").insert({owner_id,name}).select("id").single());
export const addCode=(owner_id:string,code:string,name:string)=>query(db.from("cost_codes").insert({owner_id,code,name}).select("id").single());
export const createInvoice=(owner_id:string,project_id:string,vendor_id:string,invoice_number:string)=>query(db.from("supplier_invoices").insert({owner_id,project_id,vendor_id,invoice_number}).select("id").single());
export const addInvoiceLine=(owner_id:string,invoice_id:string,description:string,quantity:number,unit_price:number,tax_rate:number)=>query(db.from("invoice_lines").insert({owner_id,invoice_id,description,quantity,unit_price,tax_rate}).select("id").single());
export const postInvoice=(id:string)=>query(db.from("supplier_invoices").update({state:"posted"}).eq("id",id).select("id").single());
export const payInvoice=(p_invoice:string,p_amount:number,p_idempotency_key:string)=>query(db.rpc("az_cost_pay_invoice",{p_invoice,p_amount,p_idempotency_key}));
export const budgets=()=>query<Array<{id:string;title:string;project_id:string;state:string}>>(db.from("project_budgets").select("id,title,project_id,state"));
export const createBudget=(owner_id:string,project_id:string,title:string)=>query(db.from("project_budgets").insert({owner_id,project_id,title}).select("id").single());
export const addBudgetLine=(owner_id:string,budget_id:string,cost_code_id:string,amount:number)=>query(db.from("budget_lines").insert({owner_id,budget_id,cost_code_id,amount}).select("id").single());
