import { useState } from "react";
import { IconArrowRight, IconMinus, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEED_BILL } from "@/data/seed";
import { hueForId } from "@/lib/palette";
import { expenseCodec, MAX_BILL_NAME_LENGTH, personCodec, type Bill } from "@/lib/split";

const MIN_PEOPLE = 2;
const MAX_PEOPLE = 12;

const heroPanelGradient = "linear-gradient(150deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))";

/**
 * Encode a whole bill the way `useUrlState` does — every value in ONE query
 * param, arrays as a JSON array of per-element encodings (never repeated
 * params). Assigning it to `location.search` reloads `/` with state present, so
 * `useBill()` decodes it on mount and the bill screen renders. Read-only use of
 * the existing codecs: no maths, no new stored state, no flags.
 */
function openBill(bill: Bill): void {
  const params = new URLSearchParams();
  params.set("name", bill.name);
  params.set("currency", bill.currency);
  params.set("persons", JSON.stringify(bill.persons.map(personCodec.encode)));
  params.set("expenses", JSON.stringify(bill.expenses.map(expenseCodec.encode)));
  window.location.search = `?${params.toString()}`;
}

/**
 * The first of the two doors on `/` (bill-screen.md §1): shown only when the
 * query string carries no bill state. Either door ends the same way — bill state
 * written into the URL, which is the single source of truth. A shared link never
 * sees this, because it already has state.
 */
export function BillChooser() {
  const [people, setPeople] = useState(3);
  /** What the field shows while typing — clamped only on blur / Go. */
  const [draft, setDraft] = useState("3");
  const clamp = (n: number) => Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, n));
  const commitDraft = (): number => {
    const n = Number.parseInt(draft, 10);
    const next = Number.isNaN(n) ? people : clamp(n);
    setPeople(next);
    setDraft(String(next));
    return next;
  };
  const [name, setName] = useState("");

  const start = () => {
    const count = commitDraft();
    const stamp = Date.now().toString(36);
    const persons = Array.from({ length: count }, (_, i) => {
      const id = `p${stamp}${i}`;
      return { id, name: "", color: hueForId(id) as string };
    });
    openBill({ name: name.trim(), currency: "USD", persons, expenses: [] });
  };

  const step = (delta: number) => {
    const base = Number.parseInt(draft, 10);
    const next = clamp((Number.isNaN(base) ? people : base) + delta);
    setPeople(next);
    setDraft(String(next));
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div
        className="w-full max-w-2xl rounded-3xl px-8 py-12 text-center sm:px-10 sm:py-14"
        style={{ background: heroPanelGradient }}
      >
        <h1 className="type-h1 text-white">Split a bill</h1>
        <p className="type-body-lg mt-3 text-white/75">
          Who paid what, who owes whom — worked out as you type.
        </p>

        <Button
          type="button"
          size="lg"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-white px-8 text-base font-semibold hover:opacity-95"
          style={{ color: "var(--tint-pill-text)" }}
          onClick={() => openBill(SEED_BILL)}
        >
          View example
        </Button>

        <div className="mt-10 pt-8">
          <h2 className="type-micro font-semibold uppercase tracking-widest text-white/70">
            Start a new bill
          </h2>

          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Fewer people"
              onClick={() => step(-1)}
              className="size-14 rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <IconMinus size={28} />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_PEOPLE}
              max={MAX_PEOPLE}
              value={draft}
              aria-label="Number of people"
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              onBlur={commitDraft}
              className="field-tonal h-16 w-24 text-center text-3xl font-semibold tabular-nums"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="More people"
              onClick={() => step(1)}
              className="size-14 rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <IconPlus size={28} />
            </Button>
          </div>

          <p className="type-small mt-4 text-white/60">
            People can be excluded from single expenses later.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Input
              type="text"
              value={name}
              maxLength={MAX_BILL_NAME_LENGTH}
              placeholder="e.g. Roadtrip"
              aria-label="Bill name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  start();
                }
              }}
              className="field-tonal h-14 flex-1 max-w-xs text-base"
            />
            <Button
              type="button"
              size="lg"
              onClick={start}
              className="flex h-12 items-center rounded-full bg-white px-7 text-base font-semibold hover:opacity-95"
              style={{ color: "var(--tint-pill-text)" }}
            >
              Go
              <IconArrowRight size={22} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

