import type { InputHTMLAttributes } from "react";

type V2InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

export function V2Input({ label, error, id, className = "", ...props }: V2InputProps) {
  return <label className={`v2-field${error ? " v2-field--error" : ""}`}>{label && <span>{label}</span>}<input id={id} className={`v2-input ${className}`.trim()} aria-invalid={Boolean(error)} {...props} />{error && <span className="v2-field__error">{error}</span>}</label>;
}
