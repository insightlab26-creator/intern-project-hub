import { useState, type FormEvent } from "react";
import { useAuth } from "../../app/providers/authContext";

export default function V2LoginPage() {
  const { signInCurrentUser } = useAuth(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); try { setSaving(true); setError(""); await signInCurrentUser(email, password); } catch (caught) { setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다."); } finally { setSaving(false); } };
  return <main className="v2-login"><form className="v2-login__card" onSubmit={(event) => void submit(event)}><span>INTERN PROJECT HUB</span><h1>Control Tower</h1><p>프로젝트와 실행 업무의 운영 상태를 확인하세요.</p><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="v2-login__error">{error}</p>}<button className="v2-button v2-button--primary" disabled={saving} type="submit">{saving ? "로그인 중…" : "로그인"}</button></form></main>;
}
