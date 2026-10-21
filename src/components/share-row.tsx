import {
  IconClipboard,
  IconDownload,
  IconLink,
  IconRotate,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  expenseCodec,
  formatCurrency,
  personCodec,
  type Bill,
  type Settlement,
} from "@/lib/split";

export interface ShareRowProps {
  bill: Bill;
  settlement: Settlement;
  copyShareLink: () => Promise<boolean>;
  onReset: () => Bill;
  onUndoReset: (previous: Bill) => void;
}

/** Approximate the query-string length the share link will produce. */
function approxUrlLength(bill: Bill): number {
  const params = new URLSearchParams({
    name: bill.name,
    currency: bill.currency,
    p: JSON.stringify(bill.persons.map(personCodec.encode)),
    e: JSON.stringify(bill.expenses.map(expenseCodec.encode)),
  });
  return params.toString().length;
}

/** Plain-text summary: bill name then one transfer per line. */
function buildTextSummary(bill: Bill, settlement: Settlement): string {
  const nameOf = (id: string) => bill.persons.find((p) => p.id === id)?.name || "Unnamed";
  const lines = [bill.name || "Bill"];
  if (settlement.transfers.length === 0) {
    lines.push("All square");
  } else {
    for (const t of settlement.transfers) {
      lines.push(`${nameOf(t.fromId)} → ${nameOf(t.toId)} ${formatCurrency(t.amount, bill.currency)}`);
    }
  }
  return lines.join("\n");
}

/**
 * Draw the settlement to a canvas and download it. Uses the browser's own Canvas
 * API — no extra packages.
 *
 * SPEC-GAP: the screenboard asks for a pixel screenshot of the settlement panel
 * (html2canvas-style). Faithfully rasterising live DOM without a library is not
 * feasible here, so this renders an equivalent text-based settlement card
 * (title, totals, transfers) to the canvas instead. A human may want a true DOM
 * screenshot later.
 */
function saveImage(bill: Bill, settlement: Settlement): void {
  const nameOf = (id: string) => bill.persons.find((p) => p.id === id)?.name || "Unnamed";
  const scale = 2;
  const width = 520;
  const lineH = 34;
  const transfers = settlement.transfers;
  const bodyLines = transfers.length
    ? transfers.map((t) => `${nameOf(t.fromId)}  →  ${nameOf(t.toId)}   ${formatCurrency(t.amount, bill.currency)}`)
    : ["All square"];
  const height = 180 + bodyLines.length * lineH + 32;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#0f766e"; // teal identity tint
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";

  // fillText's fourth argument squeezes a long line to fit instead of running off the image.
  const maxTextWidth = width - 64;

  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(bill.name || "Bill", 32, 48, maxTextWidth);

  ctx.font = "600 16px system-ui, sans-serif";
  ctx.fillText(`Total spent  ${formatCurrency(settlement.totalSpent, bill.currency)}`, 32, 88, maxTextWidth);
  ctx.fillText(`To settle  ${formatCurrency(settlement.toSettle, bill.currency)}`, 32, 114, maxTextWidth);

  ctx.font = "600 15px system-ui, sans-serif";
  ctx.fillText("Payments required", 32, 152);

  ctx.font = "500 16px system-ui, sans-serif";
  bodyLines.forEach((line, i) => ctx.fillText(line, 32, 184 + i * lineH, maxTextWidth));

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "bill-splitter.png";
  a.click();
}

/**
 * The one and only sharing surface (D10): Copy link, Copy text, Save image and
 * Reset — outline buttons with `sonner` confirmations — plus the snapshot
 * disclaimer. Nowhere else in the app copies or shares.
 */
export function ShareRow({ bill, settlement, copyShareLink, onReset, onUndoReset }: ShareRowProps) {

  const handleCopyLink = async () => {
    const ok = await copyShareLink();
    if (!ok) {
      toast.error("Couldn't copy the link — copy it from the address bar instead.");
      return;
    }
    if (approxUrlLength(bill) > 1800) {
      toast("This bill is too big to fit in a link — copy the text summary instead.");
    } else {
      toast("Link copied");
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(buildTextSummary(bill, settlement));
      toast("Summary copied");
    } catch {
      toast.error("Couldn't copy the summary — check clipboard permissions.");
    }
  };

  const handleSaveImage = () => {
    saveImage(bill, settlement);
    toast("Image saved");
  };

  const handleReset = () => {
    const previous = onReset();
    toast("Reset to example bill", {
      action: { label: "Undo", onClick: () => onUndoReset(previous) },
    });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-white/20 pt-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="rounded-full text-foreground" onClick={handleCopyLink}>
          <IconLink />
          Copy link
        </Button>
        <Button variant="outline" size="sm" className="rounded-full text-foreground" onClick={handleCopyText}>
          <IconClipboard />
          Copy text
        </Button>
        <Button variant="outline" size="sm" className="rounded-full text-foreground" onClick={handleSaveImage}>
          <IconDownload />
          Save image
        </Button>
        <Button variant="outline" size="sm" className="rounded-full text-foreground" onClick={handleReset}>
          <IconRotate />
          Reset
        </Button>
      </div>
      <p className="text-xs text-white/70">
        A link is a snapshot. Edits after you send it stay with you.
      </p>
    </div>
  );
}
