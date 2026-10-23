import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import ErrorBanner from '../components/ErrorBanner';
import Reveal from '../components/Reveal';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import {
  formatDayMonth,
  formatFullDate,
  formatMonthDayTime,
  formatTime,
  parseDate,
  relativeUpcoming,
} from '../lib/date';

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function SkeletonRows({ rows = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} style={{ paddingBlock: '14px', borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton" style={{ width: '38%' }} />
          <div className="skeleton" style={{ width: '64%' }} />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { member } = useAuth();
  const { data, error, loading, reload } = useApiData(() => api.dashboardSummary(), []);

  const firstName = (member?.display_name || 'Studio member').split(' ')[0];
  const summary = data;
  const upcoming = summary?.upcoming_firings ?? [];
  const sheets = summary?.recent_load_sheets ?? [];
  const tiles = summary?.recent_glaze_tiles ?? [];
  const statusCounts = summary?.sheet_status_counts ?? { draft: 0, loaded: 0, fired: 0 };

  return (
    <>
      <Reveal as="header" className="page-head">
        <div>
          <span className="eyebrow">Studio desk</span>
          <h1>
            {greetingForNow()}, {firstName}.
          </h1>
          <p className="page-lede">
            {formatFullDate(new Date())} — here is what the kilns are doing and what still needs a load sheet.
          </p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-accent" to="/calendar/new">
            Schedule a firing <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Reveal>

      <Reveal className="stat-band" as="section" aria-label="Studio at a glance">
        <div>
          <div className="stat-label">Upcoming firings</div>
          <div className="stat-value">{summary ? summary.upcoming_count : '––'}</div>
          <div className="stat-note">Scheduled from now on</div>
        </div>
        <div>
          <div className="stat-label">Cooling now</div>
          <div className="stat-value">{summary ? summary.cooling_now : '––'}</div>
          <div className="stat-note">Kilns inside a cooldown window</div>
        </div>
        <div>
          <div className="stat-label">Kilns on the floor</div>
          <div className="stat-value">{summary ? summary.kiln_count : '––'}</div>
          <div className="stat-note">Electric and gas</div>
        </div>
        <div>
          <div className="stat-label">Sheet status</div>
          <div className="stat-value">
            {statusCounts.draft}/{statusCounts.loaded}/{statusCounts.fired}
          </div>
          <div className="stat-note">draft · loaded · fired</div>
        </div>
      </Reveal>

      {error ? (
        <div style={{ marginTop: 'var(--s6)' }}>
          <ErrorBanner
            title="The studio summary did not load."
            message={error.message}
            onRetry={reload}
          />
        </div>
      ) : null}

      <div className="dash-grid">
        <Reveal className="stack">
          <section aria-labelledby="next-firings">
            <div className="section-label">
              <h2 id="next-firings">Next firings</h2>
              <Link className="link-arrow" to="/calendar">
                Open the calendar <span aria-hidden="true">→</span>
              </Link>
            </div>

            {loading ? <SkeletonRows rows={4} /> : null}

            {!loading && upcoming.length === 0 ? (
              <div className="empty-state">
                <h3>No firings on the books.</h3>
                <p>The schedule is clear. Pick a kiln and put the next load on the calendar.</p>
                <Link className="btn btn-small" to="/calendar/new">
                  Schedule a firing <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : null}

            {upcoming.length > 0 ? (
              <ul className="row-list">
                {upcoming.map((firing) => {
                  const start = parseDate(firing.scheduled_start);
                  const cooldownEnd = parseDate(firing.cooldown_end);
                  const badge = formatDayMonth(start);
                  return (
                    <li key={firing.id}>
                      <Link className="row-link" to="/calendar">
                        <span className="date-badge">
                          <span className="db-day">{badge.day}</span>
                          <span className="db-month">{badge.month}</span>
                        </span>
                        <span>
                          <span className="row-title">{firing.title}</span>
                          <span className="row-meta">
                            {firing.kiln_name} · {relativeUpcoming(firing.scheduled_start)} · cool until{' '}
                            {formatMonthDayTime(cooldownEnd)}
                          </span>
                        </span>
                        <span className="row-aside">
                          <span className="ra-primary">{firing.target_cone}</span>
                          <span className="ra-sub">{formatTime(start)} start</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="recent-tiles">
            <div className="section-label">
              <h2 id="recent-tiles">Latest glaze tests</h2>
              <Link className="link-arrow" to="/glazes">
                Open the gallery <span aria-hidden="true">→</span>
              </Link>
            </div>
            {loading ? <SkeletonRows rows={2} /> : null}
            {!loading && tiles.length === 0 ? (
              <p className="page-lede">No test tiles recorded yet.</p>
            ) : null}
            {tiles.length > 0 ? (
              <div className="tile-strip">
                {tiles.map((tile) => (
                  <Link key={tile.id} to={`/glazes/${tile.id}`}>
                    <span
                      className="swatch"
                      style={{ background: tile.color_hex, display: 'block' }}
                      aria-hidden="true"
                    />
                    <span className="strip-name">{tile.name}</span>
                    <span className="strip-meta">
                      {tile.cone} · {tile.rating}/5
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </Reveal>

        <Reveal className="stack" delay={90}>
          <section aria-labelledby="recent-sheets">
            <div className="section-label">
              <h2 id="recent-sheets">Recent load sheets</h2>
              <Link className="link-arrow" to="/load-sheets">
                All sheets <span aria-hidden="true">→</span>
              </Link>
            </div>
            {loading ? <SkeletonRows rows={3} /> : null}
            {!loading && sheets.length === 0 ? (
              <div className="empty-state">
                <h3>No load sheets yet.</h3>
                <p>Record the first load — kiln, cone, cone temperature and ware count.</p>
                <Link className="btn btn-small" to="/load-sheets/new">
                  New load sheet <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : null}
            {sheets.length > 0 ? (
              <ul className="row-list">
                {sheets.map((sheet) => (
                  <li key={sheet.id}>
                    <Link
                      className="row-link"
                      to={`/load-sheets/${sheet.id}`}
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}
                    >
                      <span>
                        <span className="row-title">{sheet.title}</span>
                        <span className="row-meta">
                          {sheet.kiln_name} · {sheet.cone} · {sheet.ware_count} wares
                        </span>
                      </span>
                      <span className="row-aside">
                        <span className="ra-primary">{sheet.cone_temp_c} °C</span>
                        <span className="ra-sub">{sheet.status}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="cooling-legend">
            <div className="section-label">
              <h2 id="cooling-legend">Reading the calendar</h2>
            </div>
            <div style={{ display: 'flex', gap: 'var(--s4)', alignItems: 'center' }}>
              <span
                style={{ width: '56px', height: '28px', background: 'var(--foreground)', display: 'inline-block' }}
                aria-hidden="true"
              />
              <span className="meta-line">Firing block — kiln, cone, start time</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--s4)', alignItems: 'center', marginTop: 'var(--s2)' }}>
              <span
                className="cal-band"
                style={{ width: '56px', height: '28px', display: 'inline-block' }}
                aria-hidden="true"
              />
              <span className="meta-line">Cooldown band — the kiln stays blocked</span>
            </div>
            <p className="page-lede" style={{ marginTop: 'var(--s4)' }}>
              The desk refuses to double-book a kiln while it is firing or cooling, so the calendar never shows two
              loads in the same window.
            </p>
          </section>
        </Reveal>
      </div>
    </>
  );
}
