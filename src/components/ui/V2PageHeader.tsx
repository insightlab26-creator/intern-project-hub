import type { ReactNode } from "react";

type V2PageHeaderProps = { title: string; description?: string; eyebrow?: string; actions?: ReactNode };

export function V2PageHeader({ title, description, eyebrow, actions }: V2PageHeaderProps) {
  return <header className="v2-page-header"><div>{eyebrow && <p className="v2-page-header__eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="v2-page-header__description">{description}</p>}</div>{actions && <div className="v2-page-header__actions">{actions}</div>}</header>;
}
