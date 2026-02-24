"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/ui-store";
import type { Platform } from "@/types";

type Step = "select" | "kalshi" | "polymarket" | "success";

interface ConnectionFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionFlow({ isOpen, onClose }: ConnectionFlowProps) {
  const [step, setStep] = useState<Step>("select");
  const [kalshiKey, setKalshiKey] = useState("");
  const [kalshiSecret, setKalshiSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);

  const handleConnect = async (platform: Platform) => {
    setIsConnecting(true);
    // Simulate connection validation
    await new Promise((r) => setTimeout(r, 1500));
    setConnectionStatus(platform, "connected");
    setIsConnecting(false);
    setStep("success");
  };

  const reset = () => {
    setStep("select");
    setKalshiKey("");
    setKalshiSecret("");
    setIsConnecting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-lg glass-elevated rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-arbiter-border-subtle">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {step === "select" && "Connect Your Accounts"}
                    {step === "kalshi" && "Connect Kalshi"}
                    {step === "polymarket" && "Connect Polymarket"}
                    {step === "success" && "Connected"}
                  </h2>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {step === "select" && "Link your prediction market accounts to start trading"}
                    {step === "kalshi" && "Enter your Kalshi API credentials"}
                    {step === "polymarket" && "Connect your wallet to Polymarket"}
                    {step === "success" && "Your account has been linked successfully"}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl text-text-muted hover:text-text-secondary hover:bg-arbiter-elevated transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {/* Step: Select platform */}
                  {step === "select" && (
                    <motion.div
                      key="select"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <PlatformCard
                        name="Kalshi"
                        description="Connect via API key. Regulated US exchange for event contracts."
                        icon={
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 font-bold text-lg">
                            K
                          </div>
                        }
                        onClick={() => setStep("kalshi")}
                      />
                      <PlatformCard
                        name="Polymarket"
                        description="Connect via wallet signature. Decentralized prediction market on Polygon."
                        icon={
                          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 font-bold text-lg">
                            P
                          </div>
                        }
                        onClick={() => setStep("polymarket")}
                      />

                      <div className="mt-4 p-4 rounded-xl bg-arbiter-elevated/50 border border-arbiter-border-subtle">
                        <div className="flex gap-3">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-muted flex-shrink-0 mt-0.5">
                            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5v4M8 11h.007" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <p className="text-xs text-text-muted leading-relaxed">
                            Your credentials are encrypted with AES-256 and never stored in plain text.
                            Arbiter only uses read and trade permissions — we cannot withdraw funds.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step: Kalshi credentials */}
                  {step === "kalshi" && (
                    <motion.div
                      key="kalshi"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          API Key
                        </label>
                        <input
                          type="text"
                          value={kalshiKey}
                          onChange={(e) => setKalshiKey(e.target.value)}
                          placeholder="Enter your Kalshi API key"
                          className="arbiter-input font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          API Secret
                        </label>
                        <input
                          type="password"
                          value={kalshiSecret}
                          onChange={(e) => setKalshiSecret(e.target.value)}
                          placeholder="Enter your Kalshi API secret"
                          className="arbiter-input font-mono text-sm"
                        />
                      </div>
                      <p className="text-xs text-text-muted">
                        Generate API keys from your{" "}
                        <span className="text-indigo-400">Kalshi account settings</span>.
                        Enable trading permissions for full functionality.
                      </p>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setStep("select")}
                          className="arbiter-btn-secondary flex-1"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => handleConnect("KALSHI")}
                          disabled={!kalshiKey || !kalshiSecret || isConnecting}
                          className="arbiter-btn-primary flex-1"
                        >
                          {isConnecting ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Validating...
                            </span>
                          ) : (
                            "Connect Kalshi"
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step: Polymarket wallet */}
                  {step === "polymarket" && (
                    <motion.div
                      key="polymarket"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col items-center py-6">
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center mb-4">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-400">
                            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" strokeLinecap="round" />
                          </svg>
                        </div>
                        <p className="text-sm text-text-secondary text-center max-w-xs">
                          Sign a message with your wallet to verify ownership.
                          No gas fees required.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep("select")}
                          className="arbiter-btn-secondary flex-1"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => handleConnect("POLYMARKET")}
                          disabled={isConnecting}
                          className="arbiter-btn-primary flex-1"
                        >
                          {isConnecting ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Connecting...
                            </span>
                          ) : (
                            "Connect Wallet"
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step: Success */}
                  {step === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center py-8"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="w-16 h-16 rounded-full bg-profit-dim flex items-center justify-center mb-4"
                      >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-profit">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.div>
                      <h3 className="text-lg font-bold text-text-primary mb-1">
                        Account Connected
                      </h3>
                      <p className="text-sm text-text-secondary mb-6">
                        Your account has been linked. Prices are now syncing.
                      </p>
                      <div className="flex gap-3 w-full max-w-xs">
                        <button
                          onClick={() => setStep("select")}
                          className="arbiter-btn-secondary flex-1"
                        >
                          Connect Another
                        </button>
                        <button
                          onClick={handleClose}
                          className="arbiter-btn-primary flex-1"
                        >
                          Done
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PlatformCard({
  name,
  description,
  icon,
  onClick,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl
                 bg-arbiter-elevated/50 border border-arbiter-border-subtle
                 hover:bg-arbiter-elevated hover:border-arbiter-border
                 transition-all duration-200 text-left group"
    >
      {icon}
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors">
          {name}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-text-muted group-hover:text-text-secondary transition-colors"
      >
        <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
