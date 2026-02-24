"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatPrice, formatCurrency } from "@/lib/utils";
import type { Platform, Side } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TradePanelProps {
  isOpen: boolean;
  marketId: string | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface PlatformOption {
  platform: Platform;
  label: string;
  yesPrice: number;
  noPrice: number;
  liquidity: number;
}

const MOCK_MARKET = {
  id: "market-btc-100k",
  title: "Will Bitcoin exceed $100,000 by March 31, 2026?",
  category: "Crypto",
  closingTime: new Date("2026-03-31T23:59:59Z"),
  platforms: [
    {
      platform: "KALSHI" as Platform,
      label: "Kalshi",
      yesPrice: 0.62,
      noPrice: 0.38,
      liquidity: 485_000,
    },
    {
      platform: "POLYMARKET" as Platform,
      label: "Polymarket",
      yesPrice: 0.65,
      noPrice: 0.35,
      liquidity: 1_230_000,
    },
  ] satisfies PlatformOption[],
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: {
      type: "spring" as const,
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: {
    x: "100%",
    transition: {
      type: "spring" as const,
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
};

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Close (X) button for the panel header. */
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg",
        "bg-arbiter-elevated hover:bg-arbiter-border/50",
        "text-text-tertiary hover:text-text-primary",
        "border border-arbiter-border-subtle hover:border-arbiter-border",
        "transition-all duration-200 ease-spring",
      )}
      aria-label="Close trade panel"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/** Pill-shaped YES / NO toggle selector. */
function SideSelector({
  selected,
  onSelect,
}: {
  selected: Side;
  onSelect: (side: Side) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-arbiter-elevated border border-arbiter-border-subtle">
      {(["YES", "NO"] as const).map((side) => {
        const isActive = selected === side;
        const isYes = side === "YES";

        return (
          <button
            key={side}
            type="button"
            onClick={() => onSelect(side)}
            className={cn(
              "relative flex-1 px-6 py-2.5 rounded-full text-sm font-semibold",
              "transition-colors duration-200 ease-spring",
              isActive
                ? "text-white"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="side-selector-pill"
                className={cn(
                  "absolute inset-0 rounded-full",
                  isYes
                    ? "bg-profit/20 border border-profit/30 shadow-glow-profit"
                    : "bg-loss/20 border border-loss/30 shadow-glow-loss",
                )}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                }}
              />
            )}
            <span
              className={cn(
                "relative z-10",
                isActive && isYes && "text-profit",
                isActive && !isYes && "text-loss",
              )}
            >
              {side}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Platform selector radio showing platform name, price, and liquidity. */
function PlatformSelector({
  platforms,
  selectedSide,
  selectedPlatform,
  onSelect,
}: {
  platforms: PlatformOption[];
  selectedSide: Side;
  selectedPlatform: Platform;
  onSelect: (platform: Platform) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
        Platform
      </label>
      <div className="flex flex-col gap-1.5">
        {platforms.map((p) => {
          const isActive = selectedPlatform === p.platform;
          const price = selectedSide === "YES" ? p.yesPrice : p.noPrice;

          return (
            <button
              key={p.platform}
              type="button"
              onClick={() => onSelect(p.platform)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl",
                "border transition-all duration-200 ease-spring",
                isActive
                  ? "bg-indigo-500/8 border-indigo-500/30 shadow-glow"
                  : "bg-arbiter-elevated border-arbiter-border-subtle hover:border-arbiter-border",
              )}
            >
              <div className="flex items-center gap-3">
                {/* Radio indicator */}
                <span
                  className={cn(
                    "flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors duration-200",
                    isActive
                      ? "border-indigo-500"
                      : "border-text-muted",
                  )}
                >
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-indigo-500"
                    />
                  )}
                </span>
                <div className="flex flex-col items-start gap-0.5">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-text-primary" : "text-text-secondary",
                    )}
                  >
                    {p.label}
                  </span>
                  <span className="text-2xs text-text-muted">
                    {(p.liquidity / 1000).toFixed(0)}K liquidity
                  </span>
                </div>
              </div>

              {/* Price display */}
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  selectedSide === "YES" ? "text-profit" : "text-loss",
                )}
                data-price
              >
                {formatPrice(price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Dollar amount input with shares/payout calculation. */
function PositionSizer({
  amount,
  onAmountChange,
  shares,
  payout,
}: {
  amount: string;
  onAmountChange: (val: string) => void;
  shares: number;
  payout: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
        Amount
      </label>

      {/* Dollar input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            // Allow empty, numbers, and decimals
            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
              onAmountChange(val);
            }
          }}
          placeholder="0.00"
          className={cn(
            "arbiter-input pl-8 pr-4 text-right text-lg font-semibold tabular-nums",
            "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30",
          )}
        />
      </div>

      {/* Quick amount buttons */}
      <div className="flex items-center gap-2">
        {[10, 25, 50, 100].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onAmountChange(String(preset))}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium",
              "bg-arbiter-elevated border border-arbiter-border-subtle",
              "text-text-secondary hover:text-text-primary hover:border-arbiter-border",
              "transition-all duration-150 ease-spring",
              amount === String(preset) && "border-indigo-500/40 text-indigo-400",
            )}
          >
            ${preset}
          </button>
        ))}
      </div>

      {/* Shares & payout calculations */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs text-text-muted">Shares</span>
          <span className="text-sm font-semibold text-text-primary tabular-nums" data-price>
            {shares > 0 ? shares.toFixed(2) : "--"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 items-end">
          <span className="text-2xs text-text-muted">Payout if correct</span>
          <span className="text-sm font-semibold text-profit tabular-nums" data-price>
            {payout > 0 ? formatCurrency(payout) : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Summary card showing trade details before confirmation. */
function OrderSummary({
  side,
  platform,
  shares,
  price,
  total,
  profit,
}: {
  side: Side;
  platform: string;
  shares: number;
  price: number;
  total: number;
  profit: number;
}) {
  const isYes = side === "YES";

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Side", value: side },
    { label: "Platform", value: platform },
    { label: "Shares", value: shares.toFixed(2) },
    { label: "Price per share", value: formatPrice(price) },
    { label: "Total cost", value: formatCurrency(total) },
    { label: "Potential profit", value: `+${formatCurrency(profit)}`, highlight: true },
  ];

  return (
    <div className="flex flex-col gap-0.5 rounded-xl overflow-hidden border border-arbiter-border-subtle">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            "flex items-center justify-between px-4 py-2.5",
            i % 2 === 0 ? "bg-arbiter-surface" : "bg-arbiter-elevated/50",
          )}
        >
          <span className="text-xs text-text-tertiary">{row.label}</span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              row.highlight
                ? "text-profit"
                : row.label === "Side"
                  ? isYes
                    ? "text-profit"
                    : "text-loss"
                  : "text-text-primary",
            )}
            data-price
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TradePanel
// ---------------------------------------------------------------------------

export function TradePanel({ isOpen, marketId, onClose }: TradePanelProps) {
  // -- State ----------------------------------------------------------------
  const [side, setSide] = useState<Side>("YES");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("POLYMARKET");
  const [amount, setAmount] = useState<string>("");
  const [step, setStep] = useState<"configure" | "confirm">("configure");

  // -- Derived data ---------------------------------------------------------
  const market = MOCK_MARKET;

  const activePlatform = useMemo(
    () => market.platforms.find((p) => p.platform === selectedPlatform) ?? market.platforms[0],
    [market.platforms, selectedPlatform],
  );

  const price = side === "YES" ? activePlatform.yesPrice : activePlatform.noPrice;
  const parsedAmount = parseFloat(amount) || 0;
  const shares = parsedAmount > 0 ? parsedAmount / price : 0;
  // At $1/share resolution, payout = shares * $1
  const payout = shares;
  const profit = payout - parsedAmount;

  const canConfirm = parsedAmount > 0;

  // -- Handlers -------------------------------------------------------------
  const handleClose = useCallback(() => {
    setStep("configure");
    setAmount("");
    setSide("YES");
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    setStep("confirm");
  }, [canConfirm]);

  const handleBack = useCallback(() => {
    setStep("configure");
  }, []);

  const handleExecute = useCallback(() => {
    // In a real implementation this would call the trade API.
    // For now, close the panel after "executing".
    handleClose();
  }, [handleClose]);

  // -- Render ---------------------------------------------------------------
  return (
    <AnimatePresence>
      {isOpen && marketId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="trade-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />

          {/* Panel */}
          <motion.aside
            key="trade-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "fixed right-0 top-0 z-50 h-full w-full max-w-[420px]",
              "flex flex-col",
              "bg-arbiter-surface/80 backdrop-blur-2xl",
              "border-l border-arbiter-border-subtle",
              "shadow-card-hover",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Trade panel"
          >
            {/* ------- Header ------- */}
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-arbiter-border-subtle">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-2xs font-semibold uppercase tracking-wider text-indigo-400">
                  {step === "configure" ? "New Trade" : "Confirm Trade"}
                </span>
                <h2 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
                  {market.title}
                </h2>
              </div>
              <CloseButton onClick={handleClose} />
            </div>

            {/* ------- Body with step transitions ------- */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <AnimatePresence mode="wait">
                {step === "configure" ? (
                  <motion.div
                    key="step-configure"
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-6 px-6 py-6"
                  >
                    {/* Side selector */}
                    <SideSelector selected={side} onSelect={setSide} />

                    {/* Platform selector */}
                    <PlatformSelector
                      platforms={market.platforms}
                      selectedSide={side}
                      selectedPlatform={selectedPlatform}
                      onSelect={setSelectedPlatform}
                    />

                    {/* Position sizing */}
                    <PositionSizer
                      amount={amount}
                      onAmountChange={setAmount}
                      shares={shares}
                      payout={payout}
                    />

                    {/* Order summary preview */}
                    {canConfirm && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 block">
                          Order Summary
                        </label>
                        <OrderSummary
                          side={side}
                          platform={activePlatform.label}
                          shares={shares}
                          price={price}
                          total={parsedAmount}
                          profit={profit}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-confirm"
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-6 px-6 py-6"
                  >
                    {/* Confirmation header */}
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div
                        className={cn(
                          "flex items-center justify-center w-14 h-14 rounded-2xl",
                          side === "YES"
                            ? "bg-profit/15 border border-profit/25"
                            : "bg-loss/15 border border-loss/25",
                        )}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          className={side === "YES" ? "text-profit" : "text-loss"}
                        >
                          {side === "YES" ? (
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : (
                            <path
                              d="M6 6l12 12M18 6L6 18"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-semibold text-text-primary">
                          Review Your Trade
                        </span>
                        <span className="text-xs text-text-tertiary text-center max-w-[280px]">
                          Please review the details below before executing your trade.
                        </span>
                      </div>
                    </div>

                    {/* Full summary */}
                    <OrderSummary
                      side={side}
                      platform={activePlatform.label}
                      shares={shares}
                      price={price}
                      total={parsedAmount}
                      profit={profit}
                    />

                    {/* Disclaimer */}
                    <p className="text-2xs text-text-muted text-center leading-relaxed px-2">
                      By executing this trade you acknowledge that prediction market
                      outcomes are uncertain and you may lose your entire position.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ------- Footer action buttons ------- */}
            <div className="px-6 pb-6 pt-4 border-t border-arbiter-border-subtle">
              {step === "configure" ? (
                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={handleConfirm}
                  className="arbiter-btn-primary w-full py-3 text-sm"
                >
                  Confirm Trade
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleExecute}
                    className={cn(
                      "w-full py-3 text-sm font-semibold rounded-xl",
                      "text-white transition-all duration-200 ease-spring",
                      "shadow-glow-lg hover:brightness-110 active:brightness-90",
                      side === "YES"
                        ? "bg-profit hover:bg-profit/90"
                        : "bg-loss hover:bg-loss/90",
                    )}
                  >
                    Execute Trade
                  </button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="arbiter-btn-secondary w-full py-2.5 text-sm"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
