import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useData } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as api from "@/lib/financial-api";

export default function FinancePage() {
 const {user}=useAuth(); const {projects}=useData();
 const [vendors,setVendors]=useState<api.Vendor[]>([]);
 const [invoices,setInvoices]=useState<api.Invoice[]>([]);
 const [balances,setBalances]=useState<api.Balance[]>([]);
 const [codes,setCodes]=useState<api.CostCode[]>([]);
 const [budgets,setBudgets]=useState<Array<{id:string;title:string;project_id:string;state:string}>>([]);
 const [vendorName,setVendorName]=useState(""),[invoiceNumber,setInvoiceNumber]=useState("");
 const [projectId,setProjectId]=useState(""),[vendorId,setVendorId]=useState("");
 const [draftInvoiceId,setDraftInvoiceId]=useState(""),[paymentInvoiceId,setPaymentInvoiceId]=useState(""),[description,setDescription]=useState("");
 const [quantity,setQuantity]=useState("1"),[unitPrice,setUnitPrice]=useState(""),[taxRate,setTaxRate]=useState("0");
 const [payment,setPayment]=useState(""),[paymentKey,setPaymentKey]=useState(()=>crypto.randomUUID()),[costCode,setCostCode]=useState(""),[costName,setCostName]=useState("");
 const [budgetTitle,setBudgetTitle]=useState(""),[budgetId,setBudgetId]=useState(""),[budgetCode,setBudgetCode]=useState(""),[budgetAmount,setBudgetAmount]=useState("");
 const [saving,setSaving]=useState(false);
 const refresh=async()=>{try {
  const [v,i,b,c,p]=await Promise.all([api.vendors(),api.invoices(),api.balances(),api.codes(),api.budgets()]);
  setVendors(v);setInvoices(i);setBalances(b);setCodes(c);setBudgets(p);
 } catch(e){toast.error(e instanceof Error?e.message:"تعذر تحميل البيانات المالية");}};
 useEffect(()=>{void refresh();},[]);
 const run=async(fn:()=>Promise<unknown>)=>{if(saving)return;setSaving(true);try{await fn();toast.success("تم الحفظ");await refresh();}catch(e){toast.error(e instanceof Error?e.message:"فشل الحفظ");}finally{setSaving(false);}};
 const money=(n:number)=>Number(n).toLocaleString("ar-EG",{minimumFractionDigits:2,maximumFractionDigits:2});
 const picker=(values:{id:string;name:string}[],value:string,set:(v:string)=>void,label:string)=><select aria-label={label} className="rounded border p-2" value={value} onChange={e=>set(e.target.value)}><option value="">{label}</option>{values.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>;
 return <div dir="rtl" className="space-y-6">
  <h1 className="text-2xl font-bold">الإدارة المالية للمشروعات</h1>
  <section className="space-y-3 rounded-lg border p-4"><h2 className="font-semibold">الموردون</h2>
   <div className="flex flex-wrap gap-2"><Input className="max-w-xs" placeholder="اسم المورد" value={vendorName} onChange={e=>setVendorName(e.target.value)}/><Button disabled={saving||!user||!vendorName.trim()} onClick={()=>void run(async()=>{await api.addVendor(user!.id,vendorName.trim());setVendorName("");})}>إضافة مورد</Button></div>
   <p>{vendors.map(x=>x.name).join("، ")||"لا يوجد موردون"}</p>
  </section>
  <section className="space-y-3 rounded-lg border p-4"><h2 className="font-semibold">فواتير الموردين</h2>
   <div className="flex flex-wrap gap-2">{picker(projects.map(p=>({id:p.id,name:p.name})),projectId,setProjectId,"المشروع")}{picker(vendors,vendorId,setVendorId,"المورد")}
    <Input className="max-w-48" placeholder="رقم الفاتورة" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)}/>
    <Button disabled={saving||!user||!projectId||!vendorId||!invoiceNumber.trim()} onClick={()=>void run(async()=>{await api.createInvoice(user!.id,projectId,vendorId,invoiceNumber.trim());setInvoiceNumber("");})}>إنشاء مسودة</Button></div>
   <div className="flex flex-wrap gap-2">{picker(invoices.filter(i=>i.state==="draft").map(i=>({id:i.id,name:i.invoice_number})),draftInvoiceId,setDraftInvoiceId,"مسودة الفاتورة")}
    <Input className="max-w-48" placeholder="وصف البند" value={description} onChange={e=>setDescription(e.target.value)}/>
    <Input aria-label="الكمية" className="max-w-24" value={quantity} onChange={e=>setQuantity(e.target.value)}/>
    <Input aria-label="سعر الوحدة" className="max-w-28" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)}/>
    <Input aria-label="نسبة الضريبة" className="max-w-24" value={taxRate} onChange={e=>setTaxRate(e.target.value)}/>
    <Button disabled={saving||!user||!draftInvoiceId||!description.trim()||!(Number(quantity)>0)||unitPrice===""||Number(unitPrice)<0||taxRate===""||Number(taxRate)<0||Number(taxRate)>100} onClick={()=>void run(()=>api.addInvoiceLine(user!.id,draftInvoiceId,description,Number(quantity),Number(unitPrice),Number(taxRate)))}>إضافة بند</Button></div>
   <div className="space-y-2">{invoices.map(i=>{const b=balances.find(x=>x.id===i.id);return <div key={i.id} className="flex flex-wrap items-center gap-2 border-b py-2"><strong>{i.invoice_number}</strong><span>{vendors.find(v=>v.id===i.vendor_id)?.name}</span><span>{i.state==="posted" ? `المتبقي ${money(b?.outstanding??0)}`:"مسودة"}</span>{i.state==="draft" ? <Button size="sm" disabled={saving} onClick={()=>void run(()=>api.postInvoice(i.id))}>ترحيل</Button>:<Button size="sm" onClick={()=>setPaymentInvoiceId(i.id)}>اختيار للسداد</Button>}</div>;})}</div>
   <div className="flex flex-wrap gap-2">{picker(invoices.filter(i=>i.state==="posted").map(i=>({id:i.id,name:i.invoice_number})),paymentInvoiceId,setPaymentInvoiceId,"الفاتورة المستحقة")}
    <Input className="max-w-40" aria-label="قيمة السداد" placeholder="قيمة السداد" type="number" min="0.01" step="0.01" value={payment} onChange={e=>setPayment(e.target.value)}/>
    <Button disabled={saving||!paymentInvoiceId||!(Number(payment)>0)||!/^\\d+(\\.\\d{1,2})?$/.test(payment)||Number(payment)>Number(balances.find(b=>b.id===paymentInvoiceId)?.outstanding??0)} onClick={()=>void run(async()=>{await api.payInvoice(paymentInvoiceId,Number(payment),paymentKey);setPayment("");setPaymentKey(crypto.randomUUID());})}>تسجيل سداد</Button></div>
  </section>
  <section className="space-y-3 rounded-lg border p-4"><h2 className="font-semibold">مراكز التكلفة</h2>
   <div className="flex flex-wrap gap-2"><Input className="max-w-28" placeholder="الكود" value={costCode} onChange={e=>setCostCode(e.target.value)}/><Input className="max-w-48" placeholder="البند" value={costName} onChange={e=>setCostName(e.target.value)}/><Button disabled={saving||!user||!costCode.trim()||!costName.trim()} onClick={()=>void run(()=>api.addCode(user!.id,costCode.trim(),costName.trim()))}>إضافة</Button></div>
   <p>{codes.map(c=>`${c.code} — ${c.name}`).join("، ")||"لا توجد بنود"}</p>
  </section>
  <section className="space-y-3 rounded-lg border p-4"><h2 className="font-semibold">موازنات المشروعات</h2>
   <div className="flex flex-wrap gap-2">{picker(projects.map(p=>({id:p.id,name:p.name})),projectId,setProjectId,"مشروع الموازنة")}<Input className="max-w-48" placeholder="اسم الموازنة" value={budgetTitle} onChange={e=>setBudgetTitle(e.target.value)}/><Button disabled={saving||!user||!projectId||!budgetTitle.trim()} onClick={()=>void run(()=>api.createBudget(user!.id,projectId,budgetTitle.trim()))}>إنشاء موازنة</Button></div>
   <div className="flex flex-wrap gap-2">{picker(budgets.filter(b=>b.state==="draft").map(b=>({id:b.id,name:b.title})),budgetId,setBudgetId,"الموازنة")}{picker(codes.map(c=>({id:c.id,name:`${c.code} — ${c.name}`})),budgetCode,setBudgetCode,"مركز التكلفة")}<Input className="max-w-36" placeholder="الاعتماد" type="number" min="0" step="0.01" value={budgetAmount} onChange={e=>setBudgetAmount(e.target.value)}/><Button disabled={saving||!user||!budgetId||!budgetCode||!/^\\d+(\\.\\d{1,2})?$/.test(budgetAmount)} onClick={()=>void run(()=>api.addBudgetLine(user!.id,budgetId,budgetCode,Number(budgetAmount)))}>إضافة اعتماد</Button></div>
   <p>{budgets.map(b=>b.title).join("، ")||"لا توجد موازنات"}</p>
  </section>
 </div>;
}
