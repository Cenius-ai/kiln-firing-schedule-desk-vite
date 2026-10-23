import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import { useAuth } from '../auth/AuthContext';
import Reveal from '../components/Reveal';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { formatFullDate, parseDate } from '../lib/date';

const ROLES = ['Studio lead', 'Studio technician', 'Studio member', 'Studio assistant'];

export default function Profile() {
  useDocumentTitle('Studio profile');
  const { member, updateMember, logout } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    display_name: member?.display_name ?? '',
    studio_role: member?.studio_role ?? 'Studio member',
    bio: member?.bio ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!member) return;
    setValues({
      display_name: member.display_name,
      studio_role: member.studio_role,
      bio: member.bio,
    });
  }, [member]);

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function validate(candidate) {
    const next = {};
    const name = candidate.display_name.trim();
    if (!name) next.display_name = 'Enter the name your studio knows you by.';
    else if (name.length < 2 || name.length > 60) next.display_name = 'Display name must be 2–60 characters.';

    const role = candidate.studio_role.trim();
    if (role.length < 2 || role.length > 40) next.studio_role = 'Studio role must be 2–40 characters.';

    if (candidate.bio.length > 280) next.bio = 'Keep the bio under 280 characters.';
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateProfile({
        display_name: values.display_name.trim(),
        studio_role: values.studio_role.trim(),
        bio: values.bio.trim(),
      });
      updateMember(updated);
      setValues({
        display_name: updated.display_name,
        studio_role: updated.studio_role,
        bio: updated.bio,
      });
      setSaved(true);
    } catch (failure) {
      if (failure instanceof ApiError && Object.keys(failure.fieldErrors || {}).length > 0) {
        setErrors(failure.fieldErrors);
      } else if (failure instanceof ApiError) {
        setFormError(failure.message);
      } else {
        setFormError('Your profile could not be saved. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  const roleOptions = ROLES.includes(values.studio_role)
    ? ROLES
    : [values.studio_role, ...ROLES].filter(Boolean);

  return (
    <>
      <Reveal as="header" className="page-head">
        <div>
          <span className="eyebrow">Studio profile</span>
          <h1>Your record at the desk.</h1>
          <p className="page-lede">
            The name and role shown on the desk, plus a short bio. Your email is the studio identifier and cannot be
            edited here.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-quiet" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </Reveal>

      <div className="profile-grid">
        <Reveal as="section" className="profile-card" aria-label="Studio identity">
          <span className="eyebrow eyebrow--ink-inverse">Member</span>
          <h1>{member?.display_name ?? 'Studio member'}</h1>
          <dl>
            <div>
              <dt>Studio role</dt>
              <dd>{member?.studio_role ?? '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{member?.email ?? '—'}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>
                {member?.created_at ? formatFullDate(parseDate(member.created_at) ?? new Date()) : '—'}
              </dd>
            </div>
            <div>
              <dt>Bio</dt>
              <dd>{member?.bio ? member.bio : 'No bio yet — add a line about your work at the studio.'}</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal as="section" aria-label="Edit profile" delay={80}>
          <div className="section-label" style={{ paddingTop: 0, borderTop: 0 }}>
            <h2>Edit details</h2>
            {saved ? (
              <span className="saved-flag" role="status">
                Saved
              </span>
            ) : null}
          </div>

          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <div className="field field--wide">
              <label htmlFor="display_name">Display name</label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                value={values.display_name}
                onChange={(event) => update('display_name', event.target.value)}
                maxLength={60}
                disabled={saving}
                aria-invalid={errors.display_name ? 'true' : undefined}
                aria-describedby={errors.display_name ? 'display_name-error' : undefined}
              />
              {errors.display_name ? (
                <span className="field-error" id="display_name-error">
                  {errors.display_name}
                </span>
              ) : (
                <span className="hint">2–60 characters.</span>
              )}
            </div>

            <div className="field field--wide">
              <label htmlFor="studio_role">Studio role</label>
              <select
                id="studio_role"
                name="studio_role"
                value={values.studio_role}
                onChange={(event) => update('studio_role', event.target.value)}
                disabled={saving}
                aria-invalid={errors.studio_role ? 'true' : undefined}
                aria-describedby={errors.studio_role ? 'studio_role-error' : undefined}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {errors.studio_role ? (
                <span className="field-error" id="studio_role-error">
                  {errors.studio_role}
                </span>
              ) : null}
            </div>

            <div className="field field--wide">
              <label htmlFor="bio">Short bio</label>
              <textarea
                id="bio"
                name="bio"
                value={values.bio}
                onChange={(event) => update('bio', event.target.value)}
                maxLength={280}
                disabled={saving}
                aria-invalid={errors.bio ? 'true' : undefined}
                aria-describedby={errors.bio ? 'bio-error' : 'bio-hint'}
                placeholder="What do you fire, and what are you testing this month?"
              />
              {errors.bio ? (
                <span className="field-error" id="bio-error">
                  {errors.bio}
                </span>
              ) : (
                <span className="hint" id="bio-hint">
                  Up to 280 characters — {values.bio.length} used.
                </span>
              )}
            </div>

            {formError ? (
              <div className="form-actions">
                <div className="banner" role="alert" style={{ width: '100%' }}>
                  <span>{formError}</span>
                </div>
              </div>
            ) : null}

            <div className="form-actions">
              <button className="btn btn-accent" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
              <button type="button" className="btn btn-quiet" onClick={handleSignOut} disabled={saving}>
                Sign out
              </button>
            </div>
          </form>
        </Reveal>
      </div>
    </>
  );
}
