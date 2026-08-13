import { useCallback, useEffect, useState, type FormEvent } from "react";
import ScreenState from "../components/ScreenState";
import {
  getUserProfiles,
  inviteUser,
  sendPasswordReset,
  setUserAccountStatus,
  updateUserProfile,
  type AppRole,
  type UserProfile,
  type UserStatus,
} from "../services/authService";

const roleLabels: Record<AppRole, string> = { ADMIN: "총괄 관리자", MANAGER: "인턴 관리자", INTERN: "인턴", VIEWER: "조회자" };
const statusLabels: Record<UserStatus, string> = { ACTIVE: "활성", INACTIVE: "종료" };
const emptyInvite = { email: "", displayName: "", role: "VIEWER" as AppRole };

export default function UsersPage() {
  const [items, setItems] = useState<UserProfile[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserProfile>>({});
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      setError("");
      const data = await getUserProfiles();
      setItems(data);
      setDrafts(Object.fromEntries(data.map((user) => [user.id, { ...user }])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "사용자를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const change = (id: string, next: Partial<UserProfile>) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...next } }));
  const run = async (key: string, task: () => Promise<void>, success: string) => {
    try {
      setWorking(key);
      setError("");
      setNotice("");
      await task();
      setNotice(success);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "계정 관리 작업에 실패했습니다.");
    } finally {
      setWorking("");
    }
  };

  const save = async (id: string) => {
    const original = items.find((user) => user.id === id);
    const draft = drafts[id];
    if (!original || !draft) return;
    await run(`save:${id}`, async () => {
      if (original.status !== draft.status) await setUserAccountStatus(id, draft.status);
      await updateUserProfile({ ...draft, status: draft.status });
    }, "사용자 정보를 저장했습니다.");
  };

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault();
    await run("invite", async () => {
      await inviteUser({ ...inviteForm, redirectTo: `${window.location.origin}/reset-password` });
      setInviteForm(emptyInvite);
      setShowInvite(false);
    }, "초대 메일을 발송했습니다.");
  };

  const resetPassword = async (user: UserProfile) => {
    if (!window.confirm(`${user.display_name}에게 비밀번호 재설정 메일을 보낼까요?`)) return;
    await run(`reset:${user.id}`, () => sendPasswordReset(user.id, `${window.location.origin}/reset-password`), "비밀번호 재설정 메일을 발송했습니다.");
  };

  const toggleStatus = async (user: UserProfile) => {
    const next: UserStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const verb = next === "INACTIVE" ? "계정을 종료하고 로그인을 차단" : "계정을 다시 활성화";
    if (!window.confirm(`${user.display_name} ${verb}할까요? 과거 업무 기록은 유지됩니다.`)) return;
    await run(`status:${user.id}`, () => setUserAccountStatus(user.id, next), next === "ACTIVE" ? "계정을 활성화했습니다." : "계정을 종료했습니다.");
  };

  return <>
    <header className="page-header project-page-header"><div><p className="eyebrow">MANAGEMENT</p><h1>Users</h1><p>사용자를 초대하고 로그인 계정의 권한과 상태를 안전하게 관리합니다.</p></div><button className="primary-button" onClick={() => setShowInvite((current) => !current)}>{showInvite ? "취소" : "+ 사용자 초대"}</button></header>
    {notice && <div className="notice-message">{notice}</div>}
    {error && <div className="notice-message user-error-message">{error}</div>}
    {showInvite && <section className="project-form-card"><h2>새 사용자 초대</h2><form className="project-form" onSubmit={submitInvite}><div className="form-grid"><label>이메일 *<input type="email" required value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} /></label><label>표시 이름 *<input required value={inviteForm.displayName} onChange={(event) => setInviteForm({ ...inviteForm, displayName: event.target.value })} /></label></div><label>초기 역할<select value={inviteForm.role} onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value as AppRole })}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="form-actions"><button className="primary-button" disabled={working === "invite"}>{working === "invite" ? "발송 중..." : "초대 메일 발송"}</button></div></form></section>}
    {loading ? <ScreenState kind="loading" title="사용자를 불러오는 중입니다." /> : items.length === 0 ? <ScreenState kind="empty" title="등록된 사용자가 없습니다." /> : <section className="user-table"><div className="user-table-row user-table-header"><span>이메일</span><span>표시 이름</span><span>역할</span><span>상태</span><span>관리</span></div>{items.map((item) => { const draft = drafts[item.id] ?? item; return <div className="user-table-row" key={item.id}><span className="user-email">{item.email || "-"}</span><input value={draft.display_name} onChange={(event) => change(item.id, { display_name: event.target.value })} /><select value={draft.global_role} onChange={(event) => change(item.id, { global_role: event.target.value as AppRole })}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className={`user-account-status ${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span><div className="user-actions"><button className="secondary-button" disabled={Boolean(working)} onClick={() => void save(item.id)}>{working === `save:${item.id}` ? "저장 중" : "저장"}</button><button className="secondary-button" disabled={Boolean(working) || item.status !== "ACTIVE"} onClick={() => void resetPassword(item)}>비밀번호 재설정</button><button className={item.status === "ACTIVE" ? "danger-outline-button" : "secondary-button"} disabled={Boolean(working)} onClick={() => void toggleStatus(item)}>{working === `status:${item.id}` ? "처리 중" : item.status === "ACTIVE" ? "계정 종료" : "다시 활성화"}</button></div></div>; })}</section>}
  </>;
}
