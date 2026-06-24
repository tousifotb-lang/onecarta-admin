"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// Routes that should render WITHOUT the admin Sidebar (e.g. the login screen).
const SIDEBAR_HIDDEN_ROUTES = ["/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = SIDEBAR_HIDDEN_ROUTES.includes(pathname);

  if (hideSidebar) {
    // Full-width, no sidebar — used for the login page and any other standalone screens.
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex items-start justify-start">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto">{children}</main>
    </div>
  );
}