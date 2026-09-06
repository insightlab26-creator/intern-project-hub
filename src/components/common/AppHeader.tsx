import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/authContext";
import { V2Button } from "../ui/V2Button";
import { useLocale } from "../../i18n/internLocale";

export default function AppHeader() {
  const { profile, signOutCurrentUser } = useAuth();
  const navigate = useNavigate();
  const { locale, setLocale, t } = useLocale();
  const signOut = async () => { await signOutCurrentUser(); navigate("/"); };
  return <header className="v2-header"><Link to="/" className="v2-header-brand">Intern Project Hub</Link><div className="v2-header-user"><div className="v2-header-locale" role="group" aria-label={t("common.localeChange")}><button type="button" className={locale === "ko" ? "active" : ""} aria-pressed={locale === "ko"} onClick={() => setLocale("ko")}>한국어</button><button type="button" className={locale === "en" ? "active" : ""} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button></div><span>{profile?.display_name ?? (locale === "ko" ? "사용자" : "User")}</span><small>{profile?.global_role}</small><V2Button variant="ghost" type="button" onClick={() => void signOut()}>{t("common.logout")}</V2Button></div></header>;
}
