import { useEffect, useState } from "react";
import { IconReceipt2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { CalcCanvas } from "@/components/tools/calc-canvas";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BillChooser } from "@/components/bill-chooser";
import { PayerCard } from "@/components/payer-card";
import { SettlementPanel } from "@/components/settlement-panel";
import { ShareRow } from "@/components/share-row";
import { MAX_PERSONS, useBill } from "@/hooks/use-bill";
import { CURRENCIES, MAX_BILL_NAME_LENGTH, MAX_PERSON_NAME_LENGTH, type CurrencyCode } from "@/lib/split";

/**
 * Bill Splitter (`/`) — the single route; this tool is its own landing (D1).
 *
 * Live, backend-free split calculator. All state lives in `useBill()` (URL +
 * localStorage); every number is derived synchronously — no Calculate button.
 * The seed bill loads on first visit so the page is never blank.
 */
/** Bill keys `useUrlState` writes — any of them means "this URL carries a bill". */
const BILL_KEYS = ["name", "currency", "persons", "expenses"];

function urlHasBill(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return BILL_KEYS.some((k) => params.has(k));
}

export default function BillSplitter() {
  // Door 1 vs door 2, decided from the query string alone (bill-screen.md §1).
  // A shared link already carries state, so it skips the chooser for free.
  const [hasBill] = useState(urlHasBill);

  if (!hasBill) {
    return (
      <TooltipProvider delayDuration={200}>
        <CalcCanvas
          appName="Bill Splitter"
          tint="teal"
          icon={<IconReceipt2 className="size-5" />}
          className="max-w-6xl"
        >
          <BillChooser />
        </CalcCanvas>
        <Toaster />
      </TooltipProvider>
    );
  }

  return <BillScreen />;
}

/** The bill screen — live recalc, no wizard, no Calculate button. */
function BillScreen() {
  const { bill, settlement, actions, copyShareLink } = useBill();
  const [newPerson, setNewPerson] = useState("");
  /** Progressive disclosure: exactly one expense row is open at a time. */
  const [openExpenseId, setOpenExpenseId] = useState<string | null>(null);

  // The bill name drives the document title live (no submit).
  useEffect(() => {
    document.title = bill.name ? `${bill.name} · Bill Splitter` : "Bill Splitter";
  }, [bill.name]);

  const paidById = new Map(settlement.balances.map((b) => [b.personId, b.paid]));


  const commitNewPerson = () => {
    const name = newPerson.trim();
    if (!name) return;
    if (!actions.addPerson(name)) {
      toast(`A bill can have at most ${MAX_PERSONS} people.`);
      return;
    }
    setNewPerson("");
  };

  const handleRemovePerson = (id: string) => {
    const person = bill.persons.find((p) => p.id === id);
    const owned = bill.expenses.filter((e) => e.payerId === id).length;
    const snapshot = actions.removePerson(id);
    const label =
      owned === 0
        ? `Removed ${person?.name ?? "person"}`
        : `Removed ${person?.name ?? "person"} and ${owned} expense${owned === 1 ? "" : "s"}`;
    toast(label, {
      action: { label: "Undo", onClick: () => actions.restorePerson(snapshot) },
    });
  };

  const topBarActions = (
    <>
      <Input
        type="text"
        value={bill.name}
        maxLength={MAX_BILL_NAME_LENGTH}
        placeholder="e.g. Roadtrip"
        onChange={(e) => actions.setBillName(e.target.value)}
        aria-label="Bill name"
        className="h-9 w-[200px] min-w-0 max-w-[32vw] border-white/25 bg-white/15 text-white placeholder:text-white/60 focus-visible:ring-white/50"
      />
      <Select
        value={bill.currency}
        onValueChange={(v) => actions.setCurrency(v as CurrencyCode)}
      >
        <SelectTrigger
          aria-label="Currency"
          className="h-9 w-[120px] max-w-[26vw] border-white/25 bg-white/15 text-white focus:ring-white/50"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.symbol} {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <CalcCanvas
        appName="Bill Splitter"
        tint="teal"
        icon={<IconReceipt2 className="size-5" />}
        actions={topBarActions}
        homeHref="/"
        className="max-w-6xl"
      >
        <h1 className="sr-only">{bill.name ? `${bill.name} — bill` : "Bill"}</h1>
        <div className="grid gap-8 md:grid-cols-[minmax(0,55fr)_minmax(0,45fr)]">
          {/* People & expenses */}
          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-white/70">
              People &amp; expenses
            </h2>
            {bill.persons.map((person) => (
              <PayerCard
                key={person.id}
                person={person}
                expenses={bill.expenses.filter((e) => e.payerId === person.id)}
                persons={bill.persons}
                currency={bill.currency}
                paidTotal={paidById.get(person.id) ?? 0}
                onNameChange={actions.updatePersonName}
                onAddExpense={actions.addExpense}
                onRemovePerson={handleRemovePerson}
                onLabelChange={actions.updateExpenseLabel}
                onAmountChange={actions.updateExpenseAmount}
                onToggleSharer={actions.toggleSharer}
                onDeleteExpense={actions.removeExpense}
                openExpenseId={openExpenseId}
                onOpenExpense={setOpenExpenseId}
              />
            ))}
            <Input
              type="text"
              value={newPerson}
              maxLength={MAX_PERSON_NAME_LENGTH}
              placeholder="Add person…"
              aria-label="Add person"
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitNewPerson();
                }
              }}
              onBlur={commitNewPerson}
              className="h-10 border-white/25 bg-white/15 text-white placeholder:text-white/60 focus-visible:ring-white/50"
            />
          </section>

          {/* Settlement */}
          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-white/70">
              Settlement
            </h2>
            <SettlementPanel
              settlement={settlement}
              persons={bill.persons}
              currency={bill.currency}
            />
          </section>
        </div>

        <ShareRow
          bill={bill}
          settlement={settlement}
          copyShareLink={copyShareLink}
          onReset={actions.reset}
          onUndoReset={actions.replaceBill}
        />
      </CalcCanvas>
      <Toaster />
    </TooltipProvider>
  );
}
