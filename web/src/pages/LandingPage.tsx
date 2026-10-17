import {
  ArrowRight,
  ChartNoAxesCombined,
  Leaf,
  MessageCircle,
  ShoppingBasket,
  Sprout,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const features = [
  {
    Icon: ChartNoAxesCombined,
    title: 'Know your markets',
    description: 'Explore reported commodity prices by market and compare recent records.',
  },
  {
    Icon: MessageCircle,
    title: 'Get practical guidance',
    description: 'Ask agricultural questions and return to your previous advisory conversations.',
  },
  {
    Icon: ShoppingBasket,
    title: 'Find produce',
    description: 'Browse farmer listings, publish available produce, and send offers.',
  },
];

export function LandingPage() {
  const { user, isLoading, restorationError } = useAuth();
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="brand" to="/" aria-label="AgriSmart home">
          <span className="brand-icon"><Sprout size={23} aria-hidden="true" /></span>
          <span>Agri<span className="brand-accent">Smart</span></span>
        </Link>
        <nav className="landing-nav" aria-label="Account">
          {user ? (
            <Link className="button button-primary" to="/dashboard">Go to dashboard <ArrowRight size={16} /></Link>
          ) : (
            <>
              <Link className="landing-login" to="/login">Sign in</Link>
              <Link className="button button-primary" to="/register">Create account <ArrowRight size={16} /></Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="hero-kicker"><Leaf size={15} aria-hidden="true" /> AGRISMART · FOR FARMERS</span>
            <h1>Grow with better information.</h1>
            <p>
              Find market prices, ask for crop guidance, and connect with people
              buying and selling produce — all in one farming workspace.
            </p>
            <div className="hero-actions">
              {user ? (
                <Link className="button button-primary button-large" to="/dashboard">
                  Open your dashboard <ArrowRight size={17} />
                </Link>
              ) : (
                <>
                  <Link className="button button-primary button-large" to="/register">
                    Get started <ArrowRight size={17} />
                  </Link>
                  <Link className="button button-secondary button-large" to="/login">Sign in</Link>
                </>
              )}
            </div>
            {restorationError ? <p className="landing-notice" role="status">{restorationError}</p> : null}
            {!user && isLoading ? <p className="landing-session" role="status">Checking for a saved session…</p> : null}
          </div>
          <div className="hero-art" aria-label="AgriSmart tools for the growing season">
            <div className="hero-art-orbit" />
            <span className="hero-leaf hero-leaf-one"><Sprout size={74} aria-hidden="true" /></span>
            <span className="hero-leaf hero-leaf-two"><Leaf size={37} aria-hidden="true" /></span>
            <div className="hero-stat-card">
              <span className="hero-stat-icon"><ChartNoAxesCombined size={18} /></span>
              <span><strong>Local market insights</strong><small>Prices and history from the API</small></span>
            </div>
            <span className="hero-art-caption">A clearer view of your next step</span>
          </div>
        </section>
        <section className="features-section" aria-labelledby="features-heading">
          <div className="features-heading">
            <p className="eyebrow">ONE CONNECTED PLATFORM</p>
            <h2 id="features-heading">Tools for the work you do every day</h2>
          </div>
          <div className="feature-grid">
            {features.map(({ Icon, title, description }) => (
              <article className="feature-card" key={title}>
                <span className="feature-icon"><Icon size={21} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>AgriSmart</span>
        <span>Market and advisory data are supplied by the shared AgriSmart service.</span>
      </footer>
    </div>
  );
}
