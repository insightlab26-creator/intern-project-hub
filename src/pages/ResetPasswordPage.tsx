import { useState, type FormEvent } from "react";
import { updateCurrentPassword } from "../services/authService";
import PasswordToggle from "../components/PasswordToggle";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setMessage("비밀번호는 8자 이상 입력해주세요.");
    if (password !== confirmPassword) return setMessage("비밀번호 확인이 일치하지 않습니다.");
    try {
      setSaving(true);
      setMessage("");
      await updateCurrentPassword(password);
      setComplete(true);
      setMessage("비밀번호가 변경되었습니다. 로그인 화면으로 이동해주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="login-page"><form className="login-card" onSubmit={submit}>
    <h1>비밀번호 재설정</h1>
    <p className="subtitle">새 로그인 비밀번호를 입력해주세요.</p>
    <label>새 비밀번호<span className="password-field"><input type={showPassword ? "text" : "password"} minLength={8} required disabled={complete} value={password} onChange={(event) => setPassword(event.target.value)} /><PasswordToggle visible={showPassword} onToggle={() => setShowPassword((current) => !current)} /></span></label>
    <label>비밀번호 확인<span className="password-field"><input type={showConfirmPassword ? "text" : "password"} minLength={8} required disabled={complete} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} /></span></label>
    {!complete && <button className="login-button" disabled={saving}>{saving ? "변경 중..." : "비밀번호 변경"}</button>}
    {complete && <a className="login-button reset-login-link" href="/">로그인 화면으로 이동</a>}
    {message && <p className="message">{message}</p>}
  </form></div>;
}
