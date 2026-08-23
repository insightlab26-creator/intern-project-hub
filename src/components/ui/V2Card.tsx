import type { HTMLAttributes, ReactNode } from "react";

export function V2Card({ variant = "default", className = "", children, ...props }: HTMLAttributes<HTMLElement> & { variant?: "default" | "interactive"; children: ReactNode }) {
  return <section className={`v2-card v2-card--${variant} ${className}`.trim()} {...props}>{children}</section>;
}
