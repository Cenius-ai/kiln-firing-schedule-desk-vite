import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const DEMO = { email: 'cenius@cenius.ai', password: 'cenius' };
const TECHNICIAN = { email: 'demo@kiln.studio', password: 'demo1234' };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  useDocumentTitle('Sign in');

  const { login, member, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = location.state?.from;
  const destination = requested && requested !== '/' ? requested : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const emailRef = useRef(null);
  const submitRef = useRef(null);

  useEffect(() => {
    if (status === 'ready' && member) navigate(destination, { replace: true });
  }, [status, member, destination, navigate]);

  function validate() {
    const next = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = 'Enter your studio email.';
    else if (!EMAIL_PATTERN.test(trimmedEmail)) next.email = 'Use a valid email address, e.g. name@kiln.studio.';
    if (!password) next.password = 'Enter your password.';
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) {
      emailRef.current?.focus();
      return;
    }

    setPending(true);
    try {
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        setFormError('Email or password is incorrect.');
      } else if (failure instanceof ApiError) {
        setFormError(failure.message);
      } else {
        setFormError('Something went wrong signing in. Please try again.');
      }
    } finally {
      setPending(false);
    }
  }

  function useDemoAccount() {
    setEmail(DEMO.email);
    setPassword(DEMO.password);
    setErrors({});
    setFormError('');
    submitRef.current?.focus();
  }

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div>
          <span className="eyebrow eyebrow--ink-inverse">Kiln Firing Schedule Desk</span>
          <h1>
            Firing
            <br />
            schedule,
            <br />
            kept honest.
          </h1>
          <p>
            Cone temperature, ware count and cooling windows for every kiln in the studio — logged in one place
            instead of the whiteboard by the loading dock.
          </p>
        </div>
        <dl className="login-facts">
          <div>
            <dt>Kilns</dt>
            <dd>02</dd>
          </div>
          <div>
            <dt>This week</dt>
            <dd>04</dd>
          </div>
          <div>
            <dt>Test tiles</dt>
            <dd>06</dd>
          </div>
        </dl>
      </aside>

      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">Studio sign in</span>
          <h2>Welcome back to the desk.</h2>
          <p className="form-note">Members sign in with the email on their studio record.</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={errors.email ? 'true' : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                placeholder="name@kiln.studio"
                disabled={pending}
              />
              {errors.email ? (
                <span className="field-error" id="email-error">
                  {errors.email}
                </span>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-row">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  disabled={pending}
                />
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-pressed={showPassword}
                  aria-controls="password"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password ? (
                <span className="field-error" id="password-error">
                  {errors.password}
                </span>
              ) : null}
            </div>

            {formError ? (
              <div className="banner" role="alert">
                <span>{formError}</span>
              </div>
            ) : null}

            <button ref={submitRef} className="btn btn-accent btn-block" type="submit" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-card">
            <span className="eyebrow">Demo</span>
            <p>
              Demo: <code>cenius@cenius.ai</code> / <code>cenius</code>
            </p>
            <button type="button" className="btn btn-small" onClick={useDemoAccount}>
              Use demo account
            </button>
            <p className="demo-secondary">
              Technician account: <code>{TECHNICIAN.email}</code> / <code>{TECHNICIAN.password}</code>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
