import type { ReactNode } from "react";
import { translateUiText, useLocale } from "../../i18n/internLocale";

export function V2EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  const { t } = useLocale();
  return <section className="v2-empty-state"><h2>{translateUiText(title, t)}</h2><p>{translateUiText(description, t)}</p>{action && <div className="v2-empty-state__action">{action}</div>}</section>;
}
