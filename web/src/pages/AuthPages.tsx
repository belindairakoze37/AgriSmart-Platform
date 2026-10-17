import { z } from 'zod';
import { ArrowLeft, Sprout } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import type { RegisterData } from '../api/types';
import { useAuth } from '../auth/useAuth';

const loginSchema = z.object({
  phone_number: z.string().trim().min(9, 'Enter a valid phone number.').max(17),
  password: z.string().min(1, 'Enter your password.'),
});

const registerSchema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name.'),
  last_name: z.string().trim().min(1, 'Enter your last name.'),
  phone_number: z.string().trim().min(9, 'Enter a valid phone number.').max(17),
  email: z.union([z.literal(''), z.string().email('Enter a valid email address.')]),
  password: z.string().min(8, 'Use at least 8 characters.'),
  password_confirm: z.string().min(1, 'Confirm your password.'),
  role: z.enum(['farmer', 'buyer']),
}).refine((value) => value.password === value.password_confirm, {
  message: 'Passwords do not match.',
  path: ['password_confirm'],
});

function AuthFrame({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-aside">
        <Link className="brand auth-brand" to="/">
          <span className="brand-icon"><Sprout size={23} aria-hidden="true" /></span>
          <span>Agri<span className="brand-accent">Smart</span></span>
        </Link>
        <div className="auth-aside-copy">
          <p className="hero-kicker"><Sprout size={15} aria-hidden="true" /> YOUR FARMING WORKSPACE</p>
          <h1>Make your next farming decision with confidence.</h1>
          <p>Market insight and agricultural guidance, connected to the AgriSmart community.</p>
        </div>
        <p className="auth-aside-footer">AgriSmart · Uganda</p>
      </div>
      <section className="auth-main">
        <div className="auth-card">
          <Link className="back-link" to="/">
            <ArrowLeft size={16} aria-hidden="true" /> Back to AgriSmart
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse({ phone_number: phone, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your sign-in details.');
      return;
    }
    setBusy(true);
    try {
      await login(parsed.data.phone_number, parsed.data.password);
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(destination && destination.startsWith('/') ? destination : '/dashboard', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame>
      <p className="eyebrow">WELCOME BACK</p>
      <h2>Sign in to AgriSmart</h2>
      <p className="form-intro">Use the phone number linked to your AgriSmart account.</p>
      <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
        <label className="field">
          <span>Phone number</span>
          <input
            autoComplete="tel"
            inputMode="tel"
            name="phone_number"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+256 700 000 000"
            required
            value={phone}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button button-primary button-full" disabled={busy || isLoading} type="submit">
          {busy ? 'Signing in…' : isLoading ? 'Checking saved session…' : 'Sign in'}
        </button>
      </form>
      <p className="auth-switch">New to AgriSmart? <Link to="/register">Create an account</Link></p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { user, isLoading, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      phone_number: formData.get('phone_number'),
      email: formData.get('email') || '',
      password: formData.get('password'),
      password_confirm: formData.get('password_confirm'),
      role: formData.get('role'),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your account details.');
      return;
    }
    const values: RegisterData = {
      ...parsed.data,
      ...(parsed.data.email ? { email: parsed.data.email } : {}),
    };
    setBusy(true);
    try {
      await register(values);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame>
      <p className="eyebrow">JOIN AGRISMART</p>
      <h2>Create your account</h2>
      <p className="form-intro">Use your existing AgriSmart account on mobile or web.</p>
      <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
        <div className="form-row">
          <label className="field">
            <span>First name</span>
            <input autoComplete="given-name" name="first_name" required />
          </label>
          <label className="field">
            <span>Last name</span>
            <input autoComplete="family-name" name="last_name" required />
          </label>
        </div>
        <label className="field">
          <span>Phone number</span>
          <input autoComplete="tel" inputMode="tel" name="phone_number" placeholder="+256 700 000 000" required />
        </label>
        <label className="field">
          <span>Email <small>(optional)</small></span>
          <input autoComplete="email" name="email" type="email" />
        </label>
        <label className="field">
          <span>Account type</span>
          <select defaultValue="farmer" name="role">
            <option value="farmer">Farmer</option>
            <option value="buyer">Buyer</option>
          </select>
        </label>
        <div className="form-row">
          <label className="field">
            <span>Password</span>
            <input autoComplete="new-password" minLength={8} name="password" required type="password" />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input autoComplete="new-password" name="password_confirm" required type="password" />
          </label>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button button-primary button-full" disabled={busy || isLoading} type="submit">
          {busy ? 'Creating account…' : isLoading ? 'Checking saved session…' : 'Create account'}
        </button>
        <p className="secure-note">Your browser keeps the refresh credential in an HttpOnly cookie.</p>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthFrame>
  );
}
