import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/load-sheets', label: 'Load sheets' },
  { to: '/calendar', label: 'Firing calendar' },
  { to: '/glazes', label: 'Glaze tiles' },
  { to: '/profile', label: 'Profile' },
];

export default function AppShell() {
  const { member, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link to="/dashboard" className="wordmark">
            KILN<span>Firing Schedule Desk</span>
          </Link>
          <nav className="main-nav" aria-label="Studio sections">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-user">
            <span className="header-name">{member ? member.display_name : ''}</span>
            <button type="button" className="btn btn-quiet btn-small" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="shell app-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="shell">
          <span>Kiln Firing Schedule Desk — studio firing schedule, load sheets and glaze tests.</span>
          <span>Times are studio-local. No external services.</span>
        </div>
      </footer>
    </>
  );
}
