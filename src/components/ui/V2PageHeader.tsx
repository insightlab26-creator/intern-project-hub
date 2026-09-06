import type { ReactNode } from "react";
import { useLocale } from "../../i18n/internLocale";

type V2PageHeaderProps = { title: string; description?: string; eyebrow?: string; actions?: ReactNode };

export function V2PageHeader({ title, description, eyebrow, actions }: V2PageHeaderProps) {
  const { locale, t } = useLocale();
  const titles: Record<string, string> = { "Control Tower": "admin.title.commandCenter", Projects: "admin.title.projects", Calendar: "admin.title.calendar", "Review Queue": "admin.title.reviews", Interns: "admin.title.interns", Programs: "admin.title.programs", Documents: "admin.title.documents", Reports: "admin.title.reports", Users: "admin.title.users", Settings: "admin.title.settings", Activity: "admin.title.activity" };
  const translatedTitle = titles[title] ? t(titles[title]) : title;
  const translatedEyebrow = locale === "ko" ? ({ PROJECTS: "프로젝트", REPORTING: "보고서", CALENDAR: "일정", DOCUMENTS: "자료", INTERNS: "인턴", PROGRAMS: "프로그램", ACTIVITY: "활동 기록", SETTINGS: "설정", USERS: "사용자" }[eyebrow ?? ""] ?? eyebrow) : eyebrow;
  return <header className="v2-page-header"><div>{translatedEyebrow && <p className="v2-page-header__eyebrow">{translatedEyebrow}</p>}<h1>{translatedTitle}</h1>{description && <p className="v2-page-header__description">{description}</p>}</div>{actions && <div className="v2-page-header__actions">{actions}</div>}</header>;
}
