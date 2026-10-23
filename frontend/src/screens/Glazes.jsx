import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';
import Rating from '../components/Rating';
import Reveal from '../components/Reveal';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { relativeDays } from '../lib/date';

const SURFACE_LABELS = ['glossy', 'satin', 'matte'];

export default function Glazes() {
  useDocumentTitle('Glaze test tiles');
  const { data, error, loading, reload } = useApiData(() => api.glazeTiles(), []);
  const [coneFilter, setConeFilter] = useState('all');
  const [surfaceFilter, setSurfaceFilter] = useState('all');

  const tiles = data ?? [];
  const cones = Array.from(new Set(tiles.map((tile) => tile.cone))).sort();
  const surfaces = SURFACE_LABELS.filter((surface) => tiles.some((tile) => tile.surface === surface));

  const visible = tiles.filter(
    (tile) =>
      (coneFilter === 'all' || tile.cone === coneFilter) &&
      (surfaceFilter === 'all' || tile.surface === surfaceFilter),
  );

  const filtersActive = coneFilter !== 'all' || surfaceFilter !== 'all';

  function clearFilters() {
    setConeFilter('all');
    setSurfaceFilter('all');
  }

  return (
    <>
      <Reveal as="header" className="page-head">
        <div>
          <span className="eyebrow">Glaze test tiles</span>
          <h1>Every test, swatched.</h1>
          <p className="page-lede">
            {tiles.length} tile{tiles.length === 1 ? '' : 's'} on record. Open a tile for the full result note, or
            filter by cone and surface to compare a firing.
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-accent" to="/glazes/new">
            Record a test tile <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Reveal>

      <div className="filter-bar">
        <div className="filter-group" role="group" aria-label="Filter by cone">
          <span className="filter-label">Cone</span>
          <button
            type="button"
            className="chip"
            aria-pressed={coneFilter === 'all'}
            onClick={() => setConeFilter('all')}
          >
            All
          </button>
          {cones.map((cone) => (
            <button
              key={cone}
              type="button"
              className="chip"
              aria-pressed={coneFilter === cone}
              onClick={() => setConeFilter(cone)}
            >
              {cone}
            </button>
          ))}
        </div>

        <div className="filter-group" role="group" aria-label="Filter by surface">
          <span className="filter-label">Surface</span>
          <button
            type="button"
            className="chip"
            aria-pressed={surfaceFilter === 'all'}
            onClick={() => setSurfaceFilter('all')}
          >
            All
          </button>
          {surfaces.map((surface) => (
            <button
              key={surface}
              type="button"
              className="chip"
              aria-pressed={surfaceFilter === surface}
              onClick={() => setSurfaceFilter(surface)}
            >
              {surface}
            </button>
          ))}
        </div>

        {filtersActive ? (
          <button type="button" className="btn btn-small btn-quiet" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}

        <span className="meta-line">
          Showing {visible.length} of {tiles.length}
        </span>
      </div>

      {error ? (
        <ErrorBanner title="The glaze gallery did not load." message={error.message} onRetry={reload} />
      ) : null}

      {loading ? (
        <div className="gallery" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div className="gallery-tile" key={index}>
              <div className="glaze-swatch skeleton" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && tiles.length === 0 ? (
        <div className="empty-state">
          <h3>No test tiles yet.</h3>
          <p>Fire a tile, then record the cone, the surface and what actually happened.</p>
          <Link className="btn btn-accent" to="/glazes/new">
            Record the first test result <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}

      {!loading && tiles.length > 0 && visible.length === 0 ? (
        <div className="empty-state">
          <h3>No tiles match those filters.</h3>
          <p>
            Nothing at {coneFilter === 'all' ? 'any cone' : coneFilter} with a{' '}
            {surfaceFilter === 'all' ? 'any surface' : surfaceFilter} finish.
          </p>
          <button type="button" className="btn btn-small" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="gallery">
          {visible.map((tile) => (
            <Link className="gallery-tile" key={tile.id} to={`/glazes/${tile.id}`}>
              <div
                className="glaze-swatch"
                style={{ background: tile.color_hex }}
                aria-hidden="true"
              />
              <div className="glaze-caption">
                <h3>{tile.name}</h3>
                <p>{tile.result_notes || 'No result note recorded.'}</p>
                <div className="caption-meta">
                  <span>{tile.cone}</span>
                  <span>{tile.surface}</span>
                  <Rating value={tile.rating} />
                </div>
              </div>
              <div className="gallery-foot">
                <span className="gf-name">{tile.name}</span>
                <span className="gf-meta">
                  {tile.cone} · {tile.surface} · {tile.rating}/5 · tested {relativeDays(tile.tested_on)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
