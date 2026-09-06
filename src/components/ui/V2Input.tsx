import type { InputHTMLAttributes } from "react";
import { translateUiText, useLocale } from "../../i18n/internLocale";

type V2InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

export function V2Input({ label, error, id, className = "", ...props }: V2InputProps) {
  const { t } = useLocale();
  return <label className={`v2-field${error ? " v2-field--error" : ""}`}>{label && <span>{translateUiText(label, t)}</span>}<input id={id} className={`v2-input ${className}`.trim()} aria-invalid={Boolean(error)} placeholder={typeof props.placeholder === "string" ? translateUiText(props.placeholder, t) : props.placeholder} {...props} />{error && <span className="v2-field__error">{error}</span>}</label>;
}
