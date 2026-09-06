import type { ReactNode, SelectHTMLAttributes } from "react";
import { translateUiText, useLocale } from "../../i18n/internLocale";

type V2SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; children: ReactNode };

export function V2Select({ label, error, id, className = "", children, ...props }: V2SelectProps) {
  const { t } = useLocale();
  return <label className={`v2-field${error ? " v2-field--error" : ""}`}>{label && <span>{translateUiText(label, t)}</span>}<select id={id} className={`v2-select ${className}`.trim()} aria-invalid={Boolean(error)} {...props}>{children}</select>{error && <span className="v2-field__error">{error}</span>}</label>;
}
