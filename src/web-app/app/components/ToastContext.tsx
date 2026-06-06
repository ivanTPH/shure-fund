"use client";

/**
 * Global toast / snackbar system.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast("Decision recorded", "success");
 *   toast("Something went wrong", "error");
 *
 * ToastProvider is mounted inside AppShell so toasts persist across
 * navigation within the shell and stack correctly above the mobile nav bar.
 */

import { createContext, useCallback, useContext, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "info";

type ToastItem = { id: string; message: string; type: ToastType };

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ---------------------------------------------------------------------------
// Style config
// ---------------------------------------------------------------------------

const STYLE: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: "#f0fdf4", border: "#a7f3d0", color: "#059669", icon: "✓" },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", icon: "✗" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb", icon: "ℹ" },
};

// ---------------------------------------------------------------------------
// Provider + display
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast stack — fixed above mobile nav on small screens, bottom-right on desktop */}
      <div
        style={{
          position: "fixed",
          bottom: "80px",   // above 64px mobile nav bar
          left: "12px",
          right: "12px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          pointerEvents: "none",
        }}
        className="md:left-auto md:right-5 md:w-80 md:bottom-6"
      >
        {toasts.map((t) => {
          const s = STYLE[t.type];
          return (
            <div
              key={t.id}
              style={{
                backgroundColor: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: "14px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                pointerEvents: "auto",
              }}
            >
              <span style={{ color: s.color, fontWeight: 800, fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>
                {s.icon}
              </span>
              <p style={{ color: "var(--brand-navy, #0D1144)", fontSize: "13px", fontWeight: 500, lineHeight: 1.45, flex: 1 }}>
                {t.message}
              </p>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                style={{ color: "rgba(13,17,68,0.3)", fontSize: "14px", fontWeight: 700, flexShrink: 0, cursor: "pointer", background: "none", border: "none" }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
