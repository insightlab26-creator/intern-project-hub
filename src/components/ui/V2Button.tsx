import type { ButtonHTMLAttributes, ReactNode } from "react";
import { translateUiText, useLocale } from "../../i18n/internLocale";

type V2ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
  children: ReactNode;
};

export function V2Button({ className = "", variant = "primary", isLoading = false, disabled, children, ...props }: V2ButtonProps) {
  const { t } = useLocale();
  const label = typeof children === "string" ? translateUiText(children, t) : children;
  return <button className={`v2-button v2-button--${variant} ${className}`.trim()} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>{isLoading && <span className="v2-button__spinner" aria-hidden="true" />}{label}</button>;
}
