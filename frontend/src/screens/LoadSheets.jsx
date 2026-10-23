import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ConfirmDelete from '../components/ConfirmDelete';
import ErrorBanner from '../components/ErrorBanner';
import Reveal from '../components/Reveal';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { relativeDays } from '../lib/date';

function StatusPill({ status }) {
  return (
    <span className="status-pill" data-status={status}>
      {status}
    </span>
  );
}

export default function LoadSheets() {
  useDocumentTitle('Load sheets');
  const { data, error, loading, reload } = useApiData(
    async () => {
      const [sheets, kilns] = await Promise.all([api.loadSheets(), api.kilns()]);
      return { sheets, kilns };
    },
    [],
  );
  const [deleting, setDeleting] = useState(false);

  const sheets = data?.sheets ?? [];
  const kilns = data?.kilns ?? [];
  const totalWares = sheets.reduce((sum, sheet) => sum + sheet.ware_count, 0);

  async function handleDelete(id) {
    setDeleting(true);
    try {
      await api.deleteLoadSheet(id);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Reveal as="header" className="page-head">
        <div>
          <span className="eyebrow">Load sheets</span>
          <h1>What goes in the kiln.</h1>
          <p className="page-lede">
            One sheet per load: kiln, title, target cone, cone temperature and ware count. {sheets.length} sheet
            {sheets.length === 1 ? '' : 's'} on record, {totalWares} wares logged.
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-accent" to="/load-sheets/new">
            New load sheet <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Reveal>

      <div style={{ marginTop: 'var(--s6)' }}>
        {error ? (
          <ErrorBanner
            title="Load sheets did not load."
            message={error.message}
            onRetry={reload}
          />
        ) : null}
      </div>

      {loading ? (
        <div aria-hidden="true" style={{ marginTop: 'var(--s6)' }}>
          {[0, 1, 2].map((row) => (
            <div key={row} style={{ paddingBlock: '18px', borderBottom: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ width: '30%' }} />
              <div className="skeleton" style={{ width: '55%' }} />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && sheets.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 'var(--s6)' }}>
          <h3>No load sheets yet.</h3>
          <p>
            There are {kilns.length} kilns on the floor and nothing logged. Start with the load you are about to
            stack.
          </p>
          <Link className="btn btn-accent" to="/load-sheets/new">
            Create the first load sheet <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}

      {!loading && sheets.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 'var(--s6)' }}>
          <table className="data">
            <caption className="sr-only">Studio load sheets</caption>
            <thead>
              <tr>
                <th scope="col">Kiln</th>
                <th scope="col">Sheet</th>
                <th scope="col">Cone</th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Cone temp
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Wares
                </th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => (
                <tr key={sheet.id}>
                  <td>{sheet.kiln_name}</td>
                  <td>
                    <Link className="t-title" to={`/load-sheets/${sheet.id}`}>
                      {sheet.title}
                    </Link>
                    <span className="t-sub">logged {relativeDays(sheet.created_at)}</span>
                  </td>
                  <td>{sheet.cone}</td>
                  <td className="num">{sheet.cone_temp_c} °C</td>
                  <td className="num">{sheet.ware_count}</td>
                  <td>
                    <StatusPill status={sheet.status} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-small btn-quiet" to={`/load-sheets/${sheet.id}/edit`}>
                        Edit
                      </Link>
                      <ConfirmDelete
                        label="Delete"
                        question={`Delete “${sheet.title}”?`}
                        busyLabel="Deleting…"
                        onConfirm={() => handleDelete(sheet.id)}
                        className="btn btn-small btn-quiet"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {deleting ? <p className="form-status" role="status">Updating the sheet list…</p> : null}
    </>
  );
}
