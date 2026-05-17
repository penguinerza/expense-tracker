import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";

const NOTCH_MASK =
  "radial-gradient(circle 38px at 50% 0%, transparent 37px, black 38px)";

const LEFT_TABS = [
  {
    to: "/overview",
    label: "Overview",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: "/comparison",
    label: "Compare",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="8" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="12" />
      </svg>
    ),
  },
];

const RIGHT_TABS = [
  {
    to: "/entries",
    label: "Logs",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5" aria-hidden="true">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} className="size-5" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
];

interface BottomNavProps {
  onOpenLog: () => void;
}

export default function BottomNav({ onOpenLog }: BottomNavProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      aria-label="Main navigation"
    >
      {/* Notched opaque background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "rgb(var(--color-surface-0) / 0.97)",
          backdropFilter: "blur(20px)",
          maskImage: NOTCH_MASK,
          WebkitMaskImage: NOTCH_MASK,
        }}
      />
      {/* Notched top border */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "rgb(var(--color-surface-3))",
          maskImage: NOTCH_MASK,
          WebkitMaskImage: NOTCH_MASK,
        }}
      />

      <div className="relative flex items-stretch h-16">
        {LEFT_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-2xs font-sans font-medium tracking-wide uppercase transition-colors",
                isActive ? "text-accent" : "text-ink-muted hover:text-ink"
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

        {/* Center FAB */}
        <div className="flex-1 relative">
          <button
            onClick={onOpenLog}
            aria-label="Log an expense"
            className="absolute left-1/2 -translate-x-1/2 -top-7 flex flex-col items-center gap-1 transition-transform active:scale-95"
          >
            <div className="size-14 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="size-6" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="font-sans text-2xs font-medium tracking-wide uppercase text-ink-muted">
              Log
            </span>
          </button>
        </div>

        {RIGHT_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-2xs font-sans font-medium tracking-wide uppercase transition-colors",
                isActive ? "text-accent" : "text-ink-muted hover:text-ink"
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
      </div>
    </nav>
  );
}
