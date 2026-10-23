import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import ConfirmDelete from '../components/ConfirmDelete';
import ErrorBanner from '../components/ErrorBanner';
import FiringForm from '../components/FiringForm';
import Reveal from '../components/Reveal';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { formatFullDate, monthKey, parseDate, toDateTimeInputValue } from '../lib/date';

function defaultStart(dateParam) {
  const requested = dateParam ? parseDate(`${dateParam}T09:00:00`) : null;
  if (requested) return requested;
  const base = new Date();
  base.setDate(base.getDate() + 10);
  base.setHours(9, 0, 0, 0);
  return base;
}

export default function FiringEditor({ mode }) {
  const isEdit = mode === 'edit';
  const { firingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useDocumentTitle(isEdit ? 'Edit firing' : 'Schedule a firing');

  const kilnsQuery = useApiData(() => api.kilns(), []);
  const firingQuery = useApiData(
    () => (isEdit ? api.firing(firingId) : Promise.resolve(null)),
    [isEdit, firingId],
  );

  const [values, setValues] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  const kilns = kilnsQuery.data ?? [];
  const requestedKiln = Number(searchParams.get('kiln')) || null;

  useEffect(() => {
    if (values) return;

    if (isEdit) {
      const firing = firingQuery.data;
      if (!firing) return;
      setValues({
        kiln_id: String(firing.kiln_id),
        title: firing.title,
        target_cone: firing.target_cone,
        scheduled_start: toDateTimeInputValue(parseDate(firing.scheduled_start)),
        duration_hours: String(firing.duration_hours),
        cooldown_hours: String(firing.cooldown_hours),
        notes: firing.notes,
      });
      return;
    }

    if (kilns.length > 0) {
      const kilnId =
        requestedKiln && kilns.some((kiln) => kiln.id === requestedKiln) ? requestedKiln : kilns[0].id;
      setValues({
        kiln_id: String(kilnId),
        title: '',
        target_cone: 'Cone 6',
        scheduled_start: toDateTimeInputValue(defaultStart(searchParams.get('date'))),
        duration_hours: '8',
        cooldown_hours: '12',
        notes: '',
      });
    }
  }, [isEdit, firingQuery.data, kilns, values, requestedKiln, searchParams]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');
    try {
      if (isEdit) {
        await api.updateFiring(firingId, payload);
      } else {
        await api.createFiring(payload);
      }
      const start = parseDate(payload.scheduled_start);
      const month = start ? monthKey(start) : monthKey(new Date());
      navigate(`/calendar?month=${month}&kiln=${payload.kiln_id}`, { replace: true });
    } catch (failure) {
      if (failure instanceof ApiError) {
        setFieldErrors(failure.fieldErrors || {});
        if (!failure.fieldErrors || Object.keys(failure.fieldErrors).length === 0) {
          setFormError(failure.message);
        }
      } else {
        setFormError('The firing could not be saved. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const loadError = kilnsQuery.error || firingQuery.error;
  if (loadError) {
    return (
      <ErrorBanner
        title="This form could not load."
        message={loadError.message}
        onRetry={() => {
          kilnsQuery.reload();
          firingQuery.reload();
        }}
      />
    );
  }

  if (isEdit && firingQuery.data === 404) {
    return (
      <div className="empty-state">
        <h3>That firing is gone.</h3>
        <p>It may have been deleted from another session.</p>
        <Link className="btn btn-small" to="/calendar">
          Back to the calendar <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (!values) {
    return (
      <div aria-hidden="true" style={{ paddingTop: 'var(--s6)' }}>
        <div className="skeleton" style={{ width: '26%' }} />
        <div className="skeleton" style={{ width: '54%', height: '44px', marginTop: '16px' }} />
      </div>
    );
  }

  const firing = firingQuery.data;

  return (
    <>
      <Reveal as="header" className="page-head">
        <div>
          <span className="eyebrow">{isEdit ? 'Edit firing' : 'Schedule a firing'}</span>
          <h1>{isEdit ? values.title || 'Edit this firing.' : 'Put a load on the calendar.'}</h1>
          <p className="page-lede">
            The desk computes the cooldown window from the duration and cooldown hours, and refuses to overlap another
            firing or its cooling time on the same kiln.
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-quiet" to="/calendar">
            Back to calendar
          </Link>
        </div>
      </Reveal>

      <div style={{ marginTop: 'var(--s6)' }}>
        <FiringForm
          kilns={kilns}
          initialValues={values}
          submitLabel={isEdit ? 'Save firing' : 'Schedule firing'}
          busyLabel={isEdit ? 'Saving…' : 'Scheduling…'}
          submitting={submitting}
          fieldErrors={fieldErrors}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/calendar')}
        />
      </div>

      {isEdit && firing ? (
        <section style={{ marginTop: 'var(--s7)' }}>
          <div className="section-label">
            <h2>Scheduled for</h2>
            <span className="meta-line">Added by {firing.created_by_name}</span>
          </div>
          <p className="page-lede" style={{ marginTop: 0 }}>
            {formatFullDate(parseDate(firing.scheduled_start) ?? new Date())} on {firing.kiln_name}.
          </p>
          <div className="detail-actions">
            <ConfirmDelete
              label="Delete firing"
              question="Remove this firing and its cooldown window?"
              busyLabel="Deleting…"
              onConfirm={async () => {
                await api.deleteFiring(firing.id);
                navigate(`/calendar?kiln=${firing.kiln_id}`, { replace: true });
              }}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
