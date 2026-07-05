"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";

export interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container - Tailwind-style popup */}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxWidth: "400px",
          width: "calc(100% - 40px)",
        }}
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const styles = getToastStyles(toast.type);
  const icon = getToastIcon(toast.type);

  return (
    <div
      onClick={onDismiss}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "16px 20px",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)",
        background: styles.bg,
        borderLeft: `4px solid ${styles.border}`,
        color: "#1e293b",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ fontSize: "20px", flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <div style={{ flex: 1, lineHeight: 1.5 }}>{toast.message}</div>
      <span
        style={{
          fontSize: "18px",
          flexShrink: 0,
          lineHeight: 1,
          color: "#94a3b8",
          fontWeight: 300,
        }}
      >
        ×
      </span>
    </div>
  );
}

function getToastStyles(type: ToastItem["type"]): { bg: string; border: string } {
  switch (type) {
    case "success":
      return { bg: "#f0fdf4", border: "#22c55e" };
    case "error":
      return { bg: "#fef2f2", border: "#ef4444" };
    case "warning":
      return { bg: "#fffbeb", border: "#f59e0b" };
    case "info":
    default:
      return { bg: "#eff6ff", border: "#3b82f6" };
  }
}

function getToastIcon(type: ToastItem["type"]): string {
  switch (type) {
    case "success":
      return "✅";
    case "error":
      return "❌";
    case "warning":
      return "⚠️";
    case "info":
    default:
      return "ℹ️";
  }
}