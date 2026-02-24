"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: DashboardIcon,
  },
  {
    label: "Markets",
    href: "/markets",
    icon: MarketsIcon,
  },
  {
    label: "Arbitrage",
    href: "/arbitrage",
    icon: ArbitrageIcon,
  },
] as const;

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "connected" && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
      )}
      {status === "syncing" && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-profit opacity-75 animate-ping" />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2.5 w-2.5",
          status === "connected" && "bg-profit",
          status === "syncing" && "bg-profit",
          status === "connecting" && "bg-yellow-500 animate-pulse",
          status === "error" && "bg-loss",
          status === "disconnected" && "bg-text-muted"
        )}
      />
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, connections, setConnectionModal } =
    useUIStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col
                 bg-arbiter-surface/95 backdrop-blur-2xl
                 border-r border-arbiter-border-subtle"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-arbiter-border-subtle">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z"
              fill="white"
              fillOpacity="0.9"
            />
          </svg>
        </div>
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="font-semibold text-lg text-text-primary tracking-tight"
            >
              Arbiter
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                "group relative",
                isActive
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-text-secondary hover:text-text-primary hover:bg-arbiter-elevated"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-full"
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-indigo-400" : "text-text-tertiary group-hover:text-text-secondary"
                )}
              />
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Platform connections */}
      <div className="px-3 pb-3 space-y-1">
        <button
          onClick={() => setConnectionModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                     text-text-secondary hover:text-text-primary hover:bg-arbiter-elevated
                     transition-all duration-200"
        >
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <ConnectionDot status={connections.KALSHI} />
            <ConnectionDot status={connections.POLYMARKET} />
          </div>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex flex-col items-start"
              >
                <span className="text-2xs font-medium text-text-tertiary uppercase tracking-wider">
                  Connections
                </span>
                <span className="text-xs text-text-secondary">
                  {connections.KALSHI === "connected" && connections.POLYMARKET === "connected"
                    ? "All connected"
                    : connections.KALSHI === "connected" || connections.POLYMARKET === "connected"
                      ? "Partially connected"
                      : "Not connected"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-xl
                     text-text-muted hover:text-text-secondary hover:bg-arbiter-elevated
                     transition-all duration-200"
        >
          <motion.svg
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M10 12L6 8L10 4" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </button>
      </div>
    </motion.aside>
  );
}

// Inline SVG icon components
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="7" height="7" rx="2" strokeLinecap="round" />
      <rect x="11" y="2" width="7" height="4" rx="1.5" strokeLinecap="round" />
      <rect x="2" y="11" width="7" height="4" rx="1.5" strokeLinecap="round" />
      <rect x="11" y="8" width="7" height="7" rx="2" strokeLinecap="round" />
    </svg>
  );
}

function MarketsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 17V10M8 17V6M13 17V8M18 17V3" strokeLinecap="round" />
    </svg>
  );
}

function ArbitrageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8L8 4L12 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 4V13" strokeLinecap="round" />
      <path d="M16 12L12 16L8 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16V7" strokeLinecap="round" />
    </svg>
  );
}
