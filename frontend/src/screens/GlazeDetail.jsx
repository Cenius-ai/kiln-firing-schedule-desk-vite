import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import ConfirmDelete from '../components/ConfirmDelete';
import Rating from '../components/Rating';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { formatFullDate, parseDate, relativeDays } from '../lib/date';

export default function GlazeDetail() {
  const { tileId } = useParams();
  const navigate = useNavigate();

  const tileQuery = useApiData(() => api.glazeTile(tileId), [tileId]);
  const listQuery = useApiData(() => api.glazeTiles(), []);
  const tile = tileQuery.data;

  useDocumentTitle(tile ? tile.name : 'Glaze tile');

  const tiles = listQuery.data ?? [];
  const index = tiles.findIndex((item) => String(item.id) === String(tileId));
  const previous = index > 0 ? tiles[index - 1] : null;
  const next = index >= 0 && index < tiles.length - 1 ? tiles[index + 1] : null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') navigate('/glazes');
      if (event.key === 'ArrowRight' && next) navigate(`/glazes/${next.id}`);
      if (event.key === 'ArrowLeft' && previous) navigate(`/glazes/${previous.id}`);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, next, previous]);

  if (tileQuery.error?.status === 404) {
    return (
      <div className="empty-state" style={{ marginTop: 'var(--s7)' }}>
        <h3>That tile is not in the gallery.</h3>
        <p>It may have been deleted from another session.</p>
        <Link className="btn btn-small" to="/glazes">
          Back to the gallery <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (tileQuery.error) {
    return (
      <div className="empty-state" style={{ marginTop: 'var(--s7)' }}>
        <h3>The tile did not load.</h3>
        <p>{tileQuery.error.message}</p>
        <button type="button" className="btn btn-small" onClick={tileQuery.reload}>
          Try again
        </button>
      </div>
    );
  }

  if (!tile) {
    return (
      <div className="lightbox" aria-busy="true">
        <div className="lightbox-swatch" />
        <div className="lightbox-body">
          <div className="skeleton" style={{ width: '40%' }} />
          <div className="skeleton" style={{ width: '70%', height: '42px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${tile.name} test tile`}>
      <Link className="lightbox-close" to="/glazes" aria-label="Close the tile">
        ✕
      </Link>

      <div className="lightbox-swatch">
        <div className="swatch-fill" style={{ background: tile.color_hex }} />
      </div>

      <div className="lightbox-body">
        <span className="eyebrow eyebrow--ink-inverse">Glaze test tile</span>
        <h1>{tile.name}</h1>
        <div className="lightbox-meta">
          <span>{tile.cone}</span>
          <span>{tile.surface}</span>
          <span>tested {relativeDays(tile.tested_on)}</span>
          <span>{formatFullDate(parseDate(tile.tested_on) ?? new Date())}</span>
        </div>

        <div style={{ color: 'var(--background)' }}>
          <Rating value={tile.rating} />
        </div>

        <p className="lightbox-note">{tile.result_notes || 'No result note recorded for this tile.'}</p>

        <div className="lightbox-footer">
          {previous ? (
            <Link className="btn btn-small" to={`/glazes/${previous.id}`}>
              ← Previous
            </Link>
          ) : (
            <button type="button" className="btn btn-small" disabled>
              ← Previous
            </button>
          )}
          {next ? (
            <Link className="btn btn-small" to={`/glazes/${next.id}`}>
              Next →
            </Link>
          ) : (
            <button type="button" className="btn btn-small" disabled>
              Next →
            </button>
          )}
          <Link className="btn btn-small" to={`/glazes/${tile.id}/edit`}>
            Edit tile
          </Link>
          <ConfirmDelete
            label="Delete tile"
            question="Delete this test result?"
            busyLabel="Deleting…"
            onConfirm={async () => {
              await api.deleteGlazeTile(tile.id);
              navigate('/glazes', { replace: true });
            }}
          />
          <Link className="btn btn-small" to="/glazes">
            All tiles
          </Link>
        </div>
      </div>
    </div>
  );
}
