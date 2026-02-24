"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Market, ArbRisk, ArbRiskFactor, ArbRiskSeverity } from "@/types";

// ---------------------------------------------------------------------------
// Arb risk assessment (shared logic — mirrors the API-side version)
// ---------------------------------------------------------------------------

function assessArbRisk(marketA: Market, marketB: Market): ArbRisk {
  const factors: ArbRiskFactor[] = [];
  const rulesA = marketA.settlementRules;
  const rulesB = marketB.settlementRules;

  if (rulesA.source !== rulesB.source) {
    const severity: ArbRiskSeverity =
      rulesA.source.toLowerCase().includes("oracle") ||
      rulesB.source.toLowerCase().includes("oracle")
        ? "critical"
        : "warning";
    factors.push({
      type: "source_difference",
      title: "Different resolution sources",
      description: `${marketA.platform} uses "${rulesA.source}" while ${marketB.platform} uses "${rulesB.source}".`,
      severity,
    });
  }

  if (rulesA.timezone !== rulesB.timezone) {
    factors.push({
      type: "timing_difference",
      title: "Different settlement timezones",
      description: `${marketA.platform} settles in ${rulesA.timezone}, ${marketB.platform} settles in ${rulesB.timezone}.`,
      severity: "warning",
    });
  }

  if (rulesA.expirationDate !== rulesB.expirationDate) {
    factors.push({
      type: "timing_difference",
      title: "Different expiration dates",
      description: `${marketA.platform}: ${rulesA.expirationDate} vs ${marketB.platform}: ${rulesB.expirationDate}`,
      severity: "critical",
    });
  }

  if (rulesA.criteria.toLowerCase().trim() !== rulesB.criteria.toLowerCase().trim()) {
    factors.push({
      type: "wording_difference",
      title: "Different resolution criteria",
      description: "Resolution criteria wording differs between platforms.",
      severity: "warning",
    });
  }

  if (rulesA.priceSources && rulesB.priceSources) {
    const sourcesA = new Set(rulesA.priceSources.map((s) => s.toLowerCase()));
    const sourcesB = new Set(rulesB.priceSources.map((s) => s.toLowerCase()));
    const overlap = Array.from(sourcesA).filter((s) => sourcesB.has(s));
    if (overlap.length === 0 && sourcesA.size > 0 && sourcesB.size > 0) {
      factors.push({
        type: "source_difference",
        title: "No overlapping price sources",
        description: `${marketA.platform}: [${rulesA.priceSources.join(", ")}] vs ${marketB.platform}: [${rulesB.priceSources.join(", ")}]`,
        severity: "critical",
      });
    }
  }

  const MIN_LIQUIDITY = 500_000;
  if (marketA.liquidity < MIN_LIQUIDITY || marketB.liquidity < MIN_LIQUIDITY) {
    const thinSide = marketA.liquidity < marketB.liquidity ? marketA : marketB;
    factors.push({
      type: "liquidity_risk",
      title: "Low liquidity",
      description: `${thinSide.platform} has $${thinSide.liquidity.toLocaleString()} liquidity.`,
      severity: thinSide.liquidity < 250_000 ? "critical" : "warning",
    });
  }

  let level: ArbRisk["level"] = "low";
  if (factors.length > 2) level = "high";
  else if (factors.length > 0) level = "medium";

  return { level, factors };
}

// ---------------------------------------------------------------------------
// Risk factor row
// ---------------------------------------------------------------------------

function RiskFactorRow({ factor }: { factor: ArbRiskFactor }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl",
        factor.severity === "critical" && "bg-loss/8 border border-loss/15",
        factor.severity === "warning" && "bg-amber-500/8 border border-amber-500/15",
        factor.severity === "info" && "bg-sky-500/8 border border-sky-500/15",
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {factor.severity === "critical" && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-loss">
            <path d="M8 1.5l6.5 13H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 6v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
          </svg>
        )}
        {factor.severity === "warning" && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-400">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.5" fill="currentColor" />
          </svg>
        )}
        {factor.severity === "info" && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sky-400">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="8" cy="5" r="0.5" fill="currentColor" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className={cn(
          "text-sm font-medium",
          factor.severity === "critical" && "text-loss",
          factor.severity === "warning" && "text-amber-400",
          factor.severity === "info" && "text-sky-400",
        )}>
          {factor.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
          {factor.description}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side-by-side rules
// ---------------------------------------------------------------------------

function RulesColumn({ market, label }: { market: Market; label: string }) {
  const rules = market.settlementRules;
  const platformColor = market.platform === "KALSHI"
    ? "text-indigo-400"
    : "text-purple-400";

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-semibold", platformColor)}>
          {label}
        </span>
        <span className={cn(
          "arbiter-badge text-2xs",
          market.platform === "KALSHI"
            ? "bg-indigo-500/10 text-indigo-400"
            : "bg-purple-500/10 text-purple-400",
        )}>
          {market.platform}
        </span>
      </div>

      <div className="space-y-2.5">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
            Resolution Source
          </p>
          <p className="text-sm text-text-primary">{rules.source}</p>
        </div>

        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
            Criteria
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {rules.criteria}
          </p>
        </div>

        <div className="flex gap-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
              Expiration
            </p>
            <p className="text-sm text-text-primary tabular-nums">
              {rules.expirationDate}
            </p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
              Timezone
            </p>
            <p className="text-sm text-text-primary">{rules.timezone}</p>
          </div>
        </div>

        {rules.priceSources && rules.priceSources.length > 0 && (
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
              Price Sources
            </p>
            <div className="flex flex-wrap gap-1">
              {rules.priceSources.map((src) => (
                <span key={src} className="arbiter-badge bg-arbiter-elevated text-text-secondary text-2xs">
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}

        {rules.additionalNotes && (
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
              Notes
            </p>
            <p className="text-xs text-text-muted leading-relaxed italic">
              {rules.additionalNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SettlementComparisonProps {
  marketA: Market;
  marketB: Market;
  className?: string;
}

export function SettlementComparison({
  marketA,
  marketB,
  className,
}: SettlementComparisonProps) {
  const risk = useMemo(() => assessArbRisk(marketA, marketB), [marketA, marketB]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn("glass rounded-2xl overflow-hidden", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-arbiter-border-subtle">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Settlement Rules Comparison
          </h3>
          <span
            className={cn(
              "arbiter-badge border text-2xs",
              risk.level === "low" && "bg-profit/10 text-profit border-profit/20",
              risk.level === "medium" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
              risk.level === "high" && "bg-loss/10 text-loss border-loss/20",
            )}
          >
            {risk.level === "low" && "Low Arb Risk"}
            {risk.level === "medium" && "Medium Arb Risk"}
            {risk.level === "high" && "High Arb Risk"}
          </span>
        </div>
      </div>

      {/* Risk factors */}
      {risk.factors.length > 0 && (
        <div className="px-5 py-4 border-b border-arbiter-border-subtle space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
            Risk Factors
          </p>
          {risk.factors.map((factor, i) => (
            <RiskFactorRow key={i} factor={factor} />
          ))}
        </div>
      )}

      {/* Side-by-side rules */}
      <div className="px-5 py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <RulesColumn market={marketA} label="Market A" />
          <div className="hidden lg:block w-px bg-arbiter-border-subtle" />
          <div className="lg:hidden h-px bg-arbiter-border-subtle" />
          <RulesColumn market={marketB} label="Market B" />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Single market rules (when no match exists)
// ---------------------------------------------------------------------------

interface SingleSettlementRulesProps {
  market: Market;
  className?: string;
}

export function SingleSettlementRules({ market, className }: SingleSettlementRulesProps) {
  const rules = market.settlementRules;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn("glass rounded-2xl p-5 space-y-3", className)}
    >
      <h3 className="text-sm font-semibold text-text-secondary">
        Settlement Rules
      </h3>

      <div className="space-y-2.5">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
            Resolution Source
          </p>
          <p className="text-sm text-text-primary">{rules.source}</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
            Criteria
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">{rules.criteria}</p>
        </div>
        <div className="flex gap-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
              Expiration
            </p>
            <p className="text-sm text-text-primary tabular-nums">{rules.expirationDate}</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
              Timezone
            </p>
            <p className="text-sm text-text-primary">{rules.timezone}</p>
          </div>
        </div>
        {rules.additionalNotes && (
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
              Notes
            </p>
            <p className="text-xs text-text-muted leading-relaxed italic">{rules.additionalNotes}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
