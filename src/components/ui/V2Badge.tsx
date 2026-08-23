import type { ReactNode } from "react";

export function V2Badge({ variant = "neutral", children }: { variant?: "neutral" | "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  return <span className={`v2-badge v2-badge--${variant}`}>{children}</span>;
}
