"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUIStore } from "@/stores/ui-store";
import { Sidebar } from "./sidebar";

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    onChange(mql);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

function MobileHeader() {
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4
                        bg-arbiter-surface/95 backdrop-blur-2xl
                        border-b border-arbiter-border-subtle md:hidden">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z"
              fill="white"
              fillOpacity="0.9"
            />
          </svg>
        </div>
        <span className="font-semibold text-lg text-text-primary tracking-tight">
          Arbiter
        </span>
      </div>

      {/* Hamburger button */}
      <button
        onClick={toggleMobileMenu}
        className="flex items-center justify-center w-9 h-9 rounded-lg
                   text-text-secondary hover:text-text-primary hover:bg-arbiter-elevated
                   transition-colors duration-150"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 5H17" strokeLinecap="round" />
          <path d="M3 10H17" strokeLinecap="round" />
          <path d="M3 15H17" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-arbiter-bg">
      <Sidebar />

      {/* Mobile top bar */}
      {isMobile && <MobileHeader />}

      {/* Main content */}
      {isMobile ? (
        <main className="min-h-screen">
          <div className="max-w-[1440px] mx-auto px-4 py-4">
            {children}
          </div>
        </main>
      ) : (
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
      )}
    </div>
  );
}
