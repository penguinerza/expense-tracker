import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";

const TABS = [
  {
    to: "/weekly",
    label: "Weekly",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5 shrink-0" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="7" y1="15" x2="17" y2="15" />
      </svg>
    ),
  },
  {
    to: "/monthly",
    label: "Monthly",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5 shrink-0" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <rect x="7" y="14" width="4" height="4" rx="0.5" />
      </svg>
    ),
  },
  {
    to: "/comparison",
    label: "Compare",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5 shrink-0" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="8" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="12" />
      </svg>
    ),
  },
  {
    to: "/entries",
    label: "Logs",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5 shrink-0" aria-hidden="true">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
];

interface NavProps {
  onOpenLog: () => void;
}

export default function Nav({ onOpenLog }: NavProps) {
  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-dvh w-52 z-50 flex-col border-r border-surface-3 bg-surface-0/95 backdrop-blur-xl"
      aria-label="Main navigation"
    >
      {/* Brand mark */}
      <div className="px-5 py-5 border-b border-surface-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl text-ink leading-none select-none" aria-hidden="true">¥</span>
          <div>
            <p className="font-display text-sm text-ink leading-snug">Expense</p>
            <p className="font-display text-sm text-ink-muted leading-snug">Tracker</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-3 mb-1">
          <button
            onClick={onOpenLog}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-sans text-sm font-semibold transition-colors bg-accent text-white hover:bg-accent/90 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-4 shrink-0" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Log Expense</span>
          </button>
        </div>

        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg font-sans text-sm font-medium transition-colors",
                isActive
                  ? "bg-surface-2 text-ink"
                  : "text-ink-muted hover:text-ink hover:bg-surface-1"
              )
            }
          >
            {({ isActive }) => (
              <>
                {tab.icon(isActive)}
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
