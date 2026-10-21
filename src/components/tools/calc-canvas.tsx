import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CalcCanvasProps {
  /** Product name shown in the sticky top bar. */
  appName: string;
  /** Icon rendered left of the name (a Tabler icon). */
  icon?: ReactNode;
  /**
   * Right-aligned top-bar actions — varies by tool (a Share button for a
   * single-page calc, a Reset link for a wizard). Wire Share to
   * `useUrlState().copyShareLink`.
   */
  actions?: ReactNode;
  /**
   * Identity tint (one of the names in `tints.css`: green/crimson/plum/indigo/
   * azure/teal). Sets `data-tint`; the canvas fills `var(--tint-gradient)`.
   */
  tint?: string;
  children: ReactNode;
  className?: string;
  /** When set, the wordmark is a link (e.g. "/" — back to the chooser). */
  homeHref?: string;
}

/**
 * Full-bleed calculator page host — the calculator equivalent of `CardCanvas`.
 * Fills the chosen identity-tint gradient with white on-canvas text and hosts
 * frosted `.card-tonal` panels that lift off it. A minimal sticky top bar
 * carries the wordmark + a per-tool `actions` slot. Unlike `CardCanvas` (a
 * centered single card), this is a scrolling multi-panel layout for an input
 * panel + live outputs, or a `StepFlow` wizard. No context — panels read the
 * tint tokens directly.
 */
export function CalcCanvas({ appName, icon, actions, tint = "green", children, className, homeHref }: CalcCanvasProps) {
  return (
    <div data-tint={tint} className="min-h-screen w-full text-white" style={{ backgroundImage: "var(--tint-gradient)" }}>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 px-4 sm:px-6 backdrop-blur-[14px]" style={{ backgroundColor: "color-mix(in srgb, var(--tint-from) 72%, transparent)" }}>
        {homeHref ? (
          <a href={homeHref} title="Start a new bill" className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70">
            {icon}
            <span className="text-[17px] font-semibold tracking-tight">{appName}</span>
          </a>
        ) : (
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            {icon}
            <span className="text-[17px] font-semibold tracking-tight">{appName}</span>
          </div>
        )}
        {actions ? <div className="flex min-w-0 items-center gap-3">{actions}</div> : null}
      </header>

      <main className={cn("mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-10", className)}>
        {children}
      </main>
    </div>
  );
}
