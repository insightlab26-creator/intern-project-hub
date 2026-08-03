import InternsPage from "./pages/InternsPage";
import ProjectsPage from "./pages/ProjectsPage";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import "./App.css";

type UserProfile = {
  displayName: string;
  email: string;
  globalRole: "ADMIN" | "INTERN" | "VIEWER";
  status: "ACTIVE" | "INACTIVE";
  internId: string | null;
};

type MenuItem = {
  name: string;
  adminOnly?: boolean;
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [activeMenu, setActiveMenu] = useState("Dashboard");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setProfile(null);

      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setProfile(userSnap.data() as UserProfile);
          } else {
            setMessage("사용자 권한 정보가 등록되어 있지 않습니다.");
          }
        } catch (error) {
          console.error(error);
          setMessage("사용자 권한 정보를 불러오지 못했습니다.");
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      setMessage("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);

    setEmail("");
    setPassword("");
    setMessage("");
    setActiveMenu("Dashboard");
  };

  if (loading) {
    return (
      <div className="loading-page">
        <p>사용자 정보를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Intern Project Hub</h1>

          <p className="subtitle">
            프로젝트와 업무를 연결하고 지식을 지속적으로 축적합니다.
          </p>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="login-button">
            로그인
          </button>

          {message && <p className="message">{message}</p>}
        </form>
      </div>
    );
  }

  const menuGroups: {
    title?: string;
    items: MenuItem[];
  }[] = [
    {
      items: [{ name: "Dashboard" }],
    },
    {
      title: "WORK",
      items: [{ name: "Projects" }, { name: "Tasks" }],
    },
    {
      title: "KNOWLEDGE",
      items: [
        { name: "Resources" },
        { name: "Deliverables" },
        { name: "Decisions" },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        { name: "Interns", adminOnly: true },
        { name: "Manager Notes", adminOnly: true },
        { name: "Users", adminOnly: true },
      ],
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">IP</div>

          <div>
            <strong>Intern Project</strong>
            <span>Hub</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map((group, groupIndex) => {
            const visibleItems = group.items.filter(
              (item) =>
                !item.adminOnly || profile.globalRole === "ADMIN"
            );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div className="menu-group" key={groupIndex}>
                {group.title && (
                  <p className="menu-title">{group.title}</p>
                )}

                {visibleItems.map((item) => (
                  <button
                    key={item.name}
                    className={
                      activeMenu === item.name
                        ? "menu-button active"
                        : "menu-button"
                    }
                    onClick={() => setActiveMenu(item.name)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div>
            <strong>{profile.displayName}</strong>
            <span>{profile.globalRole}</span>
          </div>

          <button onClick={handleLogout}>로그아웃</button>
        </div>
      </aside>

      <main className="main-content">
        {activeMenu === "Dashboard" ? (
          <Dashboard profile={profile} />
        ) : activeMenu === "Projects" ? (
          <ProjectsPage currentUserUid={user.uid} />
        ) : activeMenu === "Interns" ? (
          <InternsPage currentUserUid={user.uid} />
        ) : (
          <EmptyPage title={activeMenu} />
        )}
        </main>
    </div>
  );
}

function Dashboard({ profile }: { profile: UserProfile }) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">DASHBOARD</p>
          <h1>안녕하세요, {profile.displayName}님.</h1>
          <p>현재 진행 중인 프로젝트와 업무를 확인하세요.</p>
        </div>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span>Active Projects</span>
          <strong>0</strong>
          <p>진행 중인 프로젝트</p>
        </div>

        <div className="summary-card">
          <span>Active Interns</span>
          <strong>0</strong>
          <p>현재 참여 인턴</p>
        </div>

        <div className="summary-card">
          <span>In Review</span>
          <strong>0</strong>
          <p>검토 대기 업무</p>
        </div>

        <div className="summary-card">
          <span>Deliverables</span>
          <strong>0</strong>
          <p>검토 대기 산출물</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>최근 업무</h2>
            <button>전체 보기</button>
          </div>

          <div className="empty-state">
            <strong>등록된 업무가 없습니다.</strong>
            <p>Task가 등록되면 최근 업무가 표시됩니다.</p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>검토 대기</h2>
          </div>

          <div className="empty-state">
            <strong>검토할 항목이 없습니다.</strong>
            <p>인턴이 업무나 산출물을 제출하면 여기에 표시됩니다.</p>
          </div>
        </div>
      </section>
    </>
  );
}

function EmptyPage({ title }: { title: string }) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">INTERN PROJECT HUB</p>
          <h1>{title}</h1>
        </div>
      </header>

      <div className="panel">
        <div className="empty-state large">
          <strong>{title} 화면</strong>
          <p>이 기능은 다음 단계에서 연결합니다.</p>
        </div>
      </div>
    </>
  );
}

export default App;