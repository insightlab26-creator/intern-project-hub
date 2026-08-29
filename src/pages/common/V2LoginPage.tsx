import { useState, type FormEvent } from "react";
import { useAuth } from "../../app/providers/authContext";

export default function V2LoginPage() {
  const { signInCurrentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await signInCurrentUser(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="v2-login">
    <section className="v2-login__brand" aria-label="Intern Project Hub">
      <div className="v2-login__brand-content">
        <div className="v2-login__identity"><span className="v2-login__mark" aria-hidden="true"><i /><i /><i /><i /></span><span>INTERN PROJECT HUB</span></div>
        <div className="v2-login__brand-message"><p>INTERN PROJECT HUB</p><h1>Intern Program<br />Control Tower</h1><p>Projects, tasks, reviews, and outputs — connected in one workspace.</p></div>
        <div className="v2-login__brand-footer"><div className="v2-login__flow" aria-label="Program workflow"><span>PROJECTS</span><i aria-hidden="true" /><span>WORK</span><i aria-hidden="true" /><span>REVIEWS</span><i aria-hidden="true" /><span>OUTPUTS</span></div><p>Connected workflow · Loop · Planner · Teams · SharePoint</p></div>
      </div>
    </section>
    <section className="v2-login__main" aria-labelledby="v2-login-heading">
      <form className="v2-login__form" onSubmit={(event) => void submit(event)}>
        <header className="v2-login__header"><h2 id="v2-login-heading">Welcome back</h2><p>Sign in to your workspace.</p></header>
        <div className="v2-login__fields">
          <label htmlFor="login-email">Email<input id="login-email" className="v2-input" type="email" autoComplete="email" placeholder="name@company.com" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label htmlFor="login-password">Password<input id="login-password" className="v2-input" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        </div>
        {error && <p className="v2-login__error" role="alert">Unable to sign in. Check your email and password.</p>}
        <button className="v2-button v2-button--primary" disabled={saving} aria-busy={saving || undefined} type="submit">{saving ? "Signing in…" : "Sign in"}</button>
        <footer className="v2-login__footer">Intern Project Hub · V2</footer>
      </form>
    </section>
  </main>;
}
