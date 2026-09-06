import type { ReactNode } from "react";
import { V2Button } from "./V2Button";
import { translateUiText, useLocale } from "../../i18n/internLocale";

type V2ModalProps = { open: boolean; title: string; children: ReactNode; footer?: ReactNode; onClose: () => void };

export function V2Modal({ open, title, children, footer, onClose }: V2ModalProps) {
  const { t } = useLocale();
  if (!open) return null;
  const translatedTitle = translateUiText(title, t);
  return <div className="v2-modal-overlay" role="presentation" onMouseDown={onClose}><section className="v2-modal" role="dialog" aria-modal="true" aria-label={translatedTitle} onMouseDown={(event) => event.stopPropagation()}><header className="v2-modal__header"><h2>{translatedTitle}</h2><V2Button variant="ghost" className="v2-modal__close" type="button" aria-label={t("common.close")} onClick={onClose}>×</V2Button></header><div className="v2-modal__body">{children}</div>{footer && <footer className="v2-modal__footer">{footer}</footer>}</section></div>;
}
