import type { Bill } from "@/lib/split";

/**
 * The seed bill — the first-run experience for every visitor (there is no auth,
 * so every user is a first-time user). It loads on first visit and is restored
 * by Reset. It is not "demo data for a separate route" — it IS the tool's first
 * state, so the calculator is never blank (calculator-family rule, D2).
 *
 * The one partial share (Jill excluded from "Present for Jill") makes the
 * exclusion feature — the whole reason this tool exists — visible in the first
 * second without any explanation.
 */
export const SEED_BILL: Bill = {
  name: "Roadtrip",
  currency: "USD",
  persons: [
    { id: "al", name: "Alice", color: "blue" },
    { id: "be", name: "Ben", color: "green" },
    { id: "ji", name: "Jill", color: "purple" },
  ],
  expenses: [
    { id: "e1", payerId: "al", label: "Dinner", rawAmount: "60", sharerIds: ["al", "be", "ji"] },
    // Jill excluded — amber "Not shared by everyone" dot renders on this row.
    { id: "e2", payerId: "al", label: "Present for Jill", rawAmount: "30", sharerIds: ["al", "be"] },
    { id: "e3", payerId: "be", label: "Airbnb", rawAmount: "120", sharerIds: ["al", "be", "ji"] },
  ],
};

/**
 * The seed's known-correct answer — used as the test fixture in `split.test.ts`
 * (D3). Share breakdown:
 * - Dinner $60 ÷ 3 = $20 each (Alice, Ben, Jill)
 * - Present for Jill $30 ÷ 2 = $15 each (Alice, Ben only)
 * - Airbnb $120 ÷ 3 = $40 each (Alice, Ben, Jill)
 * A per-person average of $210 ÷ 3 = $70 is wrong for every single person —
 * which is exactly why this template exists.
 */
export const SEED_EXPECTED = {
  totalSpent: 210,
  toSettle: 60,
  balances: [
    { personId: "al", paid: 90, owes: 75, net: 15 }, // gets back $15
    { personId: "be", paid: 120, owes: 75, net: 45 }, // gets back $45
    { personId: "ji", paid: 0, owes: 60, net: -60 }, // owes $60
  ],
  transfers: [
    { fromId: "ji", toId: "be", amount: 45 }, // Jill → Ben $45
    { fromId: "ji", toId: "al", amount: 15 }, // Jill → Alice $15
  ],
} as const;
