import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import ErrorBanner from '../components/ErrorBanner';
import LoadSheetForm from '../components/LoadSheetForm';
import Reveal from '../components/Reveal';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const BLANK = {
  kiln_id: '',
  title: '',
  cone: 'Cone 6',
  cone_temp_c: '1220',
  ware_count: '12',
  status: 'draft',
  notes: '',
};

export default function LoadSheetEditor({ mode }) {
  const isEdit = mode === 'edit';
  const { sheetId } = useParams();
  const navigate = useNavigate();

  useDocumentTitle(isEdit ? 'Edit load sheet' : 'New load sheet');

  const kilnsQuery = useApiData(() => api.kilns(), []);
  const sheetQuery = useApiData(
    () => (isEdit ? api.loadSheet(sheetId) : Promise.resolve(null)),
    [isEdit, sheetId],
  );

  const [values, setValues] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  const kilns = kilnsQuery.data ?? [];

  useEffect(() => {
    if (values) return;

    if (isEdit) {
      if (!sheetQuery.data) return;
      const sheet = sheetQuery.data;
      setValues({
        kiln_id: String(sheet.kiln_id),
        title: sheet.title,
        cone: sheet.cone,
        cone_temp_c: String(sheet.cone_temp_c),
        ware_count: String(sheet.ware_count),
        status: sheet.status,
        notes: sheet.notes,
      });
      return;
    }
    if (kilns.length > 0) {
      setValues({ ...BLANK, kiln_id: String(kilns[0].id) });
    }
  }, [isEdit, sheetQuery.data, kilns, values]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');
    try {
      if (isEdit) {
        await api.updateLoadSheet(sheetId, payload);
        navigate(`/load-sheets/${sheetId}`, { replace: true });
      } else {
        await api.createLoadSheet(payload);
        navigate('/load-sheets', { replace: true });
      }
    } catch (failure) {
      if (failure instanceof ApiError) {
        setFieldErrors(failure.fieldErrors || {});
        if (!failure.fieldErrors || Object.keys(failure.fieldErrors).length === 0) {
          setFormError(failure.message);
        }
      } else {
        setFormError('The sheet could not be saved. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const loadError = kilnsQuery.error || sheetQuery.error;
  if (loadError) {
    return (
      <ErrorBanner
        title="This form could not load."
        message={loadError.message}
        onRetry={() => {
          kilnsQuery.reload();
          sheetQuery.reload();
        }}
      />
    );
  }

  if (!values) {
    return (
      <div aria-hidden="true" style={{ paddingTop: 'var(--s6)' }}>
        <div className="skeleton" style={{ width: '30%' }} />
        <div className="skeleton" style={{ width: '60%', height: '40px', marginTop: '16px' }} />
      </div>
    );
  }

  return (
    <>
      <Reveal as="header" className="page-head">
        <div>
          <span className="eyebrow">{isEdit ? 'Edit load sheet' : 'New load sheet'}</span>
          <h1>{isEdit ? 'Correct this load.' : 'Log a kiln load.'}</h1>
          <p className="page-lede">
            Every load sheet records the kiln, the cone it is fired to, the cone temperature in Celsius and how many
            wares are inside.
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-quiet" to={isEdit ? `/load-sheets/${sheetId}` : '/load-sheets'}>
            Cancel
          </Link>
        </div>
      </Reveal>

      <div style={{ marginTop: 'var(--s6)' }}>
        <LoadSheetForm
          kilns={kilns}
          initialValues={values}
          submitLabel={isEdit ? 'Save changes' : 'Create load sheet'}
          busyLabel={isEdit ? 'Saving…' : 'Creating…'}
          submitting={submitting}
          fieldErrors={fieldErrors}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={() => navigate(isEdit ? `/load-sheets/${sheetId}` : '/load-sheets')}
        />
      </div>
    </>
  );
}
