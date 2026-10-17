import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  ChartNoAxesCombined,
  CircleUserRound,
  Home,
  Leaf,
  LogOut,
  Menu,
  MessageCircle,
  PackagePlus,
  ShoppingBasket,
  Sprout,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { getApiErrorMessage } from './api/client';
import { AdvisoryPage } from './pages/AdvisoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { ListingCreatePage } from './pages/ListingCreatePage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { MarketsPage } from './pages/MarketsPage';
import { MarketDetailPage } from './pages/MarketDetailPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ProfilePage } from './pages/ProfilePage';
import { OfficerPortalPage } from './pages/OfficerPortalPage';
import { AdminPortalPage } from './pages/AdminPortalPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <main className="loading-page" aria-live="polite">
        <span className="brand-icon"><Sprout size={23} aria-hidden="true" /></span>
        <p>Restoring your secure session…</p>
      </main>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

const navigation = [
  { to: '/dashboard', label: 'Overview', Icon: Home },
  { to: '/markets', label: 'Markets', Icon: ChartNoAxesCombined },
  { to: '/advisory', label: 'Ask an advisor', Icon: MessageCircle },
  { to: '/marketplace', label: 'Marketplace', Icon: ShoppingBasket },
  { to: '/profile', label: 'My profile', Icon: CircleUserRound },
];

function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const workspaceNavigation =
    user?.role === 'admin'
      ? [
        ...navigation,
        { to: '/officer', label: 'Officer portal', Icon: UsersRound },
        { to: '/admin', label: 'Admin console', Icon: ShieldCheck },
      ]
      : user?.role === 'extension_officer'
        ? [...navigation, { to: '/officer', label: 'Officer portal', Icon: UsersRound }]
        : navigation;
  const pageLabel =
    workspaceNavigation.find((item) => location.pathname.startsWith(item.to))?.label ??
    'AgriSmart';

  async function signOut() {
    setSignOutError('');
    setIsSigningOut(true);
    try {
      await logout();
    } catch (error) {
      setSignOutError(getApiErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link className="brand" to="/dashboard" aria-label="AgriSmart dashboard">
          <span className="brand-icon"><Sprout size={23} aria-hidden="true" /></span>
          <span>Agri<span className="brand-accent">Smart</span></span>
        </Link>
        <div className="topbar-right">
          <span className="topbar-greeting">
            {user?.first_name ? `Hello, ${user.first_name}` : 'Your farming workspace'}
          </span>
          <Link className="avatar-link" to="/profile" aria-label="Open profile">
            {(user?.first_name?.[0] ?? user?.phone_number?.[0] ?? 'A').toUpperCase()}
          </Link>
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            className="menu-toggle icon-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`} aria-label="Main navigation">
          <div className="sidebar-caption">WORKSPACE</div>
          <nav className="side-nav">
            {workspaceNavigation.map(({ to, label, Icon }) => (
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
                key={to}
                onClick={() => setMenuOpen(false)}
                to={to}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{label}</span>
                {label === 'Marketplace' ? <ArrowRight className="nav-end-icon" size={15} /> : null}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <span className="avatar-small">
                {(user?.first_name?.[0] ?? user?.phone_number?.[0] ?? 'A').toUpperCase()}
              </span>
              <span className="sidebar-user-copy">
                <strong>{user?.full_name || user?.phone_number}</strong>
                <span>{user?.role.replaceAll('_', ' ')}</span>
              </span>
            </div>
            <button
              className="nav-link signout-link"
              disabled={isSigningOut}
              onClick={() => void signOut()}
              type="button"
            >
              <LogOut aria-hidden="true" size={18} />
              <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
            {signOutError ? <p className="inline-error" role="alert">{signOutError}</p> : null}
          </div>
        </aside>
        <main className="main-content">
          <div className="mobile-page-title">
            <Leaf size={16} aria-hidden="true" />
            <span>{pageLabel}</span>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="not-found">
      <PackagePlus size={34} aria-hidden="true" />
      <h1>Page not found</h1>
      <p>This AgriSmart page does not exist.</p>
      <Link className="button button-primary" to="/">Return to AgriSmart</Link>
    </main>
  );
}

function RequireOfficerPortal() {
  const { user } = useAuth();
  if (user?.role !== 'admin' && user?.role !== 'extension_officer') {
    return <Navigate to="/dashboard" replace />;
  }
  return <OfficerPortalPage />;
}

function RequireAdministratorPortal() {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <AdminPortalPage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/markets" element={<MarketsPage />} />
                <Route path="/markets/:id" element={<MarketDetailPage />} />
                <Route path="/advisory" element={<AdvisoryPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/marketplace/create" element={<ListingCreatePage />} />
                <Route path="/marketplace/:id" element={<ListingDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/officer" element={<RequireOfficerPortal />} />
                <Route path="/admin" element={<RequireAdministratorPortal />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
