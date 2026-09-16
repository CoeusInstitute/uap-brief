"use client";

import { DeskWindowsProvider } from "@/components/DeskWindows";

export default function DeskWindowsRoot({ children }: { children: React.ReactNode }) {
  return <DeskWindowsProvider>{children}</DeskWindowsProvider>;
}
