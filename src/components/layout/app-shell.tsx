"use client";

import { motion } from "framer-motion";
import { useUIStore } from "@/stores/ui-store";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-arbiter-bg">
      <Sidebar />
      <motion.main
        initial={false}
        animate={{
          marginLeft: sidebarCollapsed ? 72 : 256,
        }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-screen"
      >
        <div className="max-w-[1440px] mx-auto px-6 py-6">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
