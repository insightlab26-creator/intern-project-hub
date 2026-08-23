import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/authContext";
import { V2Button } from "../ui/V2Button";

export default function AppHeader() {
  const { profile, signOutCurrentUser } = useAuth();
  const navigate = useNavigate();
  const signOut = async () => { await signOutCurrentUser(); navigate("/"); };
  return <header className="v2-header"><Link to="/v2" className="v2-header-brand">Intern Project Hub <small>V2</small></Link><div className="v2-header-user"><span>{profile?.display_name ?? "사용자"}</span><small>{profile?.global_role}</small><V2Button type="button" onClick={() => void signOut()}>로그아웃</V2Button></div></header>;
}
