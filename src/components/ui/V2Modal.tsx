import type { ReactNode } from "react";
import { V2Button } from "./V2Button";

type V2ModalProps = { open: boolean; title: string; children: ReactNode; footer?: ReactNode; onClose: () => void };

export function V2Modal({ open, title, children, footer, onClose }: V2ModalProps) {
  if (!open) return null;
  return <div className="v2-modal-overlay" role="presentation" onMouseDown={onClose}><section className="v2-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><header className="v2-modal__header"><h2>{title}</h2><V2Button variant="ghost" className="v2-modal__close" type="button" aria-label="닫기" onClick={onClose}>×</V2Button></header><div className="v2-modal__body">{children}</div>{footer && <footer className="v2-modal__footer">{footer}</footer>}</section></div>;
}
