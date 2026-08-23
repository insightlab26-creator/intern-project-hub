import type { ButtonHTMLAttributes } from "react";

export function V2Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`v2-button ${className}`.trim()} {...props} />;
}
