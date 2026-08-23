import type { ReactNode } from "react";

export function V2EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="v2-empty-state"><h2>{title}</h2><p>{description}</p>{action && <div className="v2-empty-state__action">{action}</div>}</section>;
}
