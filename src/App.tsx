import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import InternsPage from "./pages/InternsPage";
import ProjectsPage from "./pages/ProjectsPage";
import {
  getCurrentSession,
  getUserProfile,
  signIn as signInSupabase,
  signOut as signOutSupabase,
  type UserProfile,
} from "./services/authService";
import "./App.css";

type MenuItem = {
  name: string;
  adminOnly?: boolean;
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState("");

  const [activeMenu, setActiveMenu] =
    useState("Dashboard");

  /*
   * 페이지를 새로고침했을 때
   * 기존 Supabase 로그인 세션과 프로필을 복원한다.
   */
  useEffect(() => {
    let isMounted = true;

    const restoreAuthentication = async () => {
      try {
        const session = await getCurrentSession();

        if (!session) {
          if (isMounted) {
            setProfile(null);
          }

          return;
        }

        const userProfile = await getUserProfile(
          session.user.id
        );

        if (userProfile.status !== "ACTIVE") {
          await signOutSupabase();

          if (isMounted) {
            setProfile(null);
            setMessage(
              "비활성화된 계정입니다. 관리자에게 문의해주세요."
            );
          }

          return;
        }

        if (isMounted) {
          setProfile(userProfile);
          setMessage("");
        }
      } catch (error) {
        console.error(error);

        try {
          await signOutSupabase();
        } catch (signOutError) {
          console.error(signOutError);
        }

        if (isMounted) {
          setProfile(null);
          setMessage(
            "사용자 로그인 정보를 불러오지 못했습니다."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreAuthentication();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setSigningIn(true);
      setMessage("");

      const session = await signInSupabase(
        email,
        password
      );

      const userProfile = await getUserProfile(
        session.user.id
      );

      if (userProfile.status !== "ACTIVE") {
        await signOutSupabase();

        throw new Error(
          "비활성화된 계정입니다. 관리자에게 문의해주세요."
        );
      }

      setProfile(userProfile);
      setPassword("");
      setActiveMenu("Dashboard");
    } catch (error) {
      console.error(error);

      try {
        await signOutSupabase();
      } catch (signOutError) {
        console.error(signOutError);
      }

      setProfile(null);

      setMessage(
        error instanceof Error &&
          error.message.includes("비활성화")
          ? error.message
          : "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요."
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutSupabase();
    } catch (error) {
      console.error(error);
    } finally {
      setProfile(null);
      setEmail("");
      setPassword("");
      setMessage("");
      setActiveMenu("Dashboard");
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <p>사용자 정보를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="login-page">
        <form
          className="login-card"
          onSubmit={handleLogin}
        >
          <h1>Intern Project Hub</h1>

          <p className="subtitle">
            프로젝트와 업무를 연결하고 지식을 지속적으로
            축적합니다.
          </p>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </label>

          <button
            type="submit"
            className="login-button"
            disabled={signingIn}
          >
            {signingIn ? "로그인 중..." : "로그인"}
          </button>

          {message && (
            <p className="message">{message}</p>
          )}
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
      items: [
        { name: "Projects" },
        { name: "Tasks" },
      ],
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
        {
          name: "Interns",
          adminOnly: true,
        },
        {
          name: "Manager Notes",
          adminOnly: true,
        },
        {
          name: "Users",
          adminOnly: true,
        },
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
            const visibleItems =
              group.items.filter(
                (item) =>
                  !item.adminOnly ||
                  profile.global_role === "ADMIN"
              );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div
                className="menu-group"
                key={groupIndex}
              >
                {group.title && (
                  <p className="menu-title">
                    {group.title}
                  </p>
                )}

                {visibleItems.map((item) => (
                  <button
                    key={item.name}
                    className={
                      activeMenu === item.name
                        ? "menu-button active"
                        : "menu-button"
                    }
                    onClick={() =>
                      setActiveMenu(item.name)
                    }
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
            <strong>
              {profile.display_name}
            </strong>

            <span>
              {profile.global_role}
            </span>
          </div>

          <button onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeMenu === "Dashboard" ? (
          <Dashboard profile={profile} />
        ) : activeMenu === "Projects" ? (
          <ProjectsPage />
        ) : activeMenu === "Interns" ? (
          <InternsPage />
        ) : (
          <EmptyPage title={activeMenu} />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  profile,
}: {
  profile: UserProfile;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">
            DASHBOARD
          </p>

          <h1>
            안녕하세요, {profile.display_name}님.
          </h1>

          <p>
            현재 진행 중인 프로젝트와 업무를 확인하세요.
          </p>
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
            <strong>
              등록된 업무가 없습니다.
            </strong>

            <p>
              Task가 등록되면 최근 업무가 표시됩니다.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>검토 대기</h2>
          </div>

          <div className="empty-state">
            <strong>
              검토할 항목이 없습니다.
            </strong>

            <p>
              인턴이 업무나 산출물을 제출하면 여기에
              표시됩니다.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function EmptyPage({
  title,
}: {
  title: string;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">
            INTERN PROJECT HUB
          </p>

          <h1>{title}</h1>
        </div>
      </header>

      <div className="panel">
        <div className="empty-state large">
          <strong>{title} 화면</strong>
          <p>
            이 기능은 다음 단계에서 연결합니다.
          </p>
        </div>
      </div>
    </>
  );
}

export default App;