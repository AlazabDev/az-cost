import { NavLink, Outlet } from "react-router-dom";
import {
  IconBuildingSkyscraper,
  IconChartPie,
  IconHome2,
  IconLogout,
  IconReceipt2,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "الرئيسية", icon: IconHome2 },
  { to: "/projects", label: "المشروعات", icon: IconBuildingSkyscraper },
  { to: "/expenses", label: "المصروفات", icon: IconReceipt2 },
  { to: "/reports", label: "التقارير", icon: IconChartPie },
];

/** App frame: header with brand + sign-out, nav (top on desktop, bottom on mobile). */
export function AppShell() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header data-no-print className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <IconReceipt2 className="size-5" />
            </span>
            <span className="text-lg font-bold">UberFix</span>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
            title={user?.email ?? ""}
          >
            <IconLogout className="size-4" />
            خروج
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav
        data-no-print
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-card/95 backdrop-blur md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
