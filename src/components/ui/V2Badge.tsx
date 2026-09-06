import type { ReactNode } from "react";
import { translateUiText, useLocale } from "../../i18n/internLocale";

export function V2Badge({ variant = "neutral", children }: { variant?: "neutral" | "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  const { t } = useLocale();
  return <span className={`v2-badge v2-badge--${variant}`}>{typeof children === "string" ? translateUiText(children, t) : children}</span>;
}
