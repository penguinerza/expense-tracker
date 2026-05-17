import { useState } from "react";
import { Outlet } from "react-router-dom";
import Nav from "./Nav";
import BottomNav from "./BottomNav";
import LogModal from "./LogModal";

export default function Layout() {
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="min-h-dvh flex bg-surface-0">
      {/* Desktop sidebar spacer */}
      <div className="hidden lg:block w-52 shrink-0" aria-hidden="true" />

      <main className="flex-1 min-w-0 overflow-y-auto pb-24 lg:pb-0">
        <div className="w-full mx-auto lg:max-w-2xl">
          <Outlet />
        </div>
      </main>

      <Nav onOpenLog={() => setLogOpen(true)} />
      <BottomNav onOpenLog={() => setLogOpen(true)} />
      <LogModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
