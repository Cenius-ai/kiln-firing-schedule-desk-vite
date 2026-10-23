import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import ConfirmDelete from '../components/ConfirmDelete';
import ErrorBanner from '../components/ErrorBanner';
import Reveal from '../components/Reveal';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { formatFullDate, parseDate, relativeDays } from '../lib/date';

export default function LoadSheetDetail() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const { data: sheet, error, loading, reload } = useApiData(() => api.loadSheet(sheetId), [sheetId]);

  useDocumentTitle(sheet ? sheet.title : 'Load sheet');

  if (error && error.status === 404) {
    return (
      <div className="empty-state" style={{ marginTop: 'var(--s6)' }}>
        <h3>That load sheet is gone.</h3>
        <p>It may have been deleted from another session.</p>
        <Link className="btn btn-small" to="/load-sheets">
          Back to load sheets <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div aria-hidden="true" style={{ paddingTop: 'var(--s6)' }}>
        <div className="skeleton" style={{ width: '22%', height: '18px' }} />
        <div className="skeleton" style={{ width: '58%', height: '48px', marginTop: '16px' }} />
        <div className="skeleton" style={{ width: '40%', marginTop: '24px' }} />
      </div>
    );
  }

  if (!sheet) {
    return <ErrorBanner title="This sheet could not be loaded." message={error?.message} onRetry={reload} />;
  }

  return (
    <>
      <Reveal as="header" className="detail-head">
        <div>
          <span className="eyebrow">Load sheet #{sheet.id}</span>
          <h1>{sheet.title}</h1>
          <p className="meta-line" style={{ marginTop: 'var(--s3)' }}>
            <span>{sheet.kiln_name}</span>
            <span aria-hidden="true">·</span>
            <span>logged {relativeDays(sheet.created_at)}</span>
            <span aria-hidden="true">·</span>
            <span className="status-pill" data-status={sheet.status}>
              {sheet.status}
            </span>
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn" to={`/load-sheets/${sheet.id}/edit`}>
            Edit sheet
          </Link>
          <Link className="btn btn-quiet" to="/load-sheets">
            All sheets
          </Link>
        </div>
      </Reveal>

      <dl className="fact-grid">
        <div>
          <dt>Target cone</dt>
          <dd>{sheet.cone}</dd>
        </div>
        <div>
          <dt>Cone temperature</dt>
          <dd>{sheet.cone_temp_c} °C</dd>
        </div>
        <div>
          <dt>Ware count</dt>
          <dd>{sheet.ware_count}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd style={{ fontSize: '1rem', fontFamily: 'var(--font-body)' }}>
            {formatFullDate(parseDate(sheet.updated_at) ?? new Date())}
          </dd>
        </div>
      </dl>

      <section className="prose-block">
        <h2>Load notes</h2>
        <p>{sheet.notes ? sheet.notes : 'No notes on this sheet yet — add shelf quirks or glaze batch details when you edit it.'}</p>
      </section>

      <div className="detail-actions">
        <Link className="btn" to={`/load-sheets/${sheet.id}/edit`}>
          Edit this sheet
        </Link>
        <ConfirmDelete
          label="Delete load sheet"
          question={`Delete “${sheet.title}” permanently?`}
          busyLabel="Deleting…"
          onConfirm={async () => {
            await api.deleteLoadSheet(sheet.id);
            navigate('/load-sheets', { replace: true });
          }}
        />
      </div>
    </>
  );
}
