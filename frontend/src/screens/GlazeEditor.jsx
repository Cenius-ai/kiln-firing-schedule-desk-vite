import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import ErrorBanner from '../components/ErrorBanner';
import GlazeTileForm from '../components/GlazeTileForm';
import Reveal from '../components/Reveal';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { toDateInputValue } from '../lib/date';

function blankTile() {
  return {
    name: '',
    cone: 'Cone 6',
    surface: 'glossy',
    color_hex: '#3d2dd6',
    rating: '3',
    result_notes: '',
    tested_on: toDateInputValue(new Date()),
  };
}

export default function GlazeEditor({ mode }) {
  const isEdit = mode === 'edit';
  const { tileId } = useParams();
  const navigate = useNavigate();

  useDocumentTitle(isEdit ? 'Edit test tile' : 'Record a test tile');

  const tileQuery = useApiData(
    () => (isEdit ? api.glazeTile(tileId) : Promise.resolve(null)),
    [isEdit, tileId],
  );

  const [values, setValues] = useState(() => (isEdit ? null : blankTile()));
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const tile = tileQuery.data;
    if (!isEdit || !tile) return;
    setValues({
      name: tile.name,
      cone: tile.cone,
      surface: tile.surface,
      color_hex: tile.color_hex,
      rating: String(tile.rating),
      result_notes: tile.result_notes,
      tested_on: tile.tested_on,
    });
  }, [isEdit, tileQuery.data]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');
    try {
      if (isEdit) {
        await api.updateGlazeTile(tileId, payload);
        navigate(`/glazes/${tileId}`, { replace: true });
      } else {
        await api.createGlazeTile(payload);
        navigate('/glazes', { replace: true });
      }
    } catch (failure) {
      if (failure instanceof ApiError) {
        setFieldErrors(failure.fieldErrors || {});
        if (!failure.fieldErrors || Object.keys(failure.fieldErrors).length === 0) {
          setFormError(failure.message);
        }
      } else {
        setFormError('The test tile could not be saved. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (tileQuery.error) {
    return (
      <ErrorBanner
        title="This form could not load."
        message={tileQuery.error.message}
        onRetry={tileQuery.reload}
      />
    );
  }

  if (!values) {
    return (
      <div aria-hidden="true" style={{ paddingTop: 'var(--s6)' }}>
        <div className="skeleton" style={{ width: '24%' }} />
        <div className="skeleton" style={{ width: '52%', height: '44px', marginTop: '16px' }} />
      </div>
    );
  }

  return (
    <>
      <Reveal as="header" className="page-head">
        <div>
          <span className="eyebrow">{isEdit ? 'Edit test tile' : 'Record a test tile'}</span>
          <h1>{isEdit ? 'Correct this result.' : 'Log a glaze test.'}</h1>
          <p className="page-lede">
            Cone, surface, rating and what actually happened. The colour swatch is what the studio sees in the gallery.
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-quiet" to={isEdit ? `/glazes/${tileId}` : '/glazes'}>
            Cancel
          </Link>
        </div>
      </Reveal>

      <div style={{ marginTop: 'var(--s6)' }}>
        <GlazeTileForm
          initialValues={values}
          submitLabel={isEdit ? 'Save tile' : 'Add to gallery'}
          busyLabel={isEdit ? 'Saving…' : 'Adding…'}
          submitting={submitting}
          fieldErrors={fieldErrors}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={() => navigate(isEdit ? `/glazes/${tileId}` : '/glazes')}
        />
      </div>
    </>
  );
}
