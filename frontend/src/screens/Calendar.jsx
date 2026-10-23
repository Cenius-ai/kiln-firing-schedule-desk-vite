import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';
import Reveal from '../components/Reveal';
import { useApiData } from '../lib/useApiData';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import {
  WEEKDAY_LABELS,
  addMonths,
  buildMonthCells,
  formatMonthDayTime,
  formatMonthTitle,
  formatTime,
  formatWeekdayDate,
  dayKey,
  monthKey,
  parseDate,
  startOfDay,
} from '../lib/date';

function parseMonthParam(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function buildBuckets(firings) {
  const buckets = new Map();
  const ensure = (key) => {
    if (!buckets.has(key)) buckets.set(key, { blocks: [], bands: [] });
    return buckets.get(key);
  };

  for (const firing of firings) {
    const start = parseDate(firing.scheduled_start);
    const cooldownStart = parseDate(firing.cooldown_start);
    const cooldownEnd = parseDate(firing.cooldown_end);
    if (!start) continue;

    const startKey = dayKey(start);
    ensure(startKey).blocks.push(firing);
    if (!cooldownStart || !cooldownEnd) continue;

    let day = startOfDay(cooldownStart);
    let guard = 0;
    while (day <= cooldownEnd && guard < 130) {
      const key = dayKey(day);
      if (key !== startKey) ensure(key).bands.push(firing);
      day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      guard += 1;
    }
  }
  return buckets;
}

export default function Calendar() {
  useDocumentTitle('Firing calendar');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedKiln = Number(searchParams.get('kiln')) || null;

  const [cursor, setCursor] = useState(() => parseMonthParam(searchParams.get('month')) || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [kilnId, setKilnId] = useState(requestedKiln);

  const kilnsQuery = useApiData(() => api.kilns(), []);
  const kilns = kilnsQuery.data ?? [];

  useEffect(() => {
    if (kilnId === null && kilns.length > 0) setKilnId(kilns[0].id);
  }, [kilnId, kilns]);

  const currentMonth = monthKey(cursor);
  const firingsQuery = useApiData(
    () => (kilnId ? api.firings({ kiln_id: kilnId, month: currentMonth }) : Promise.resolve([])),
    [kilnId, currentMonth],
  );

  const firings = firingsQuery.data ?? [];
  const buckets = useMemo(() => buildBuckets(firings), [firings]);
  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);
  const selectedKiln = kilns.find((kiln) => kiln.id === kilnId);
  const todayKey = dayKey(new Date());
  const loading = kilnsQuery.loading || firingsQuery.loading;
  const error = kilnsQuery.error || firingsQuery.error;

  const agendaDays = cells
    .filter((cell) => cell.inMonth)
    .map((cell) => ({ ...cell, items: buckets.get(cell.key) }))
    .filter((cell) => cell.items && (cell.items.blocks.length > 0 || cell.items.bands.length > 0));

  function goToMonth(delta) {
    setCursor((value) => addMonths(value, delta));
  }

  return (
    <>
      <Reveal as="header" className="page-head">
        <div>
          <span className="eyebrow">Firing calendar</span>
          <h1>Every kiln, every cooldown.</h1>
          <p className="page-lede">
            Firing blocks sit on their start date; the hatched band behind them is the cooldown window the desk keeps
            blocked for that kiln.
          </p>
        </div>
        <div className="head-actions">
          <Link
            className="btn btn-accent"
            to={kilnId ? `/calendar/new?kiln=${kilnId}` : '/calendar/new'}
          >
            Schedule a firing <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Reveal>

      <div className="cal-toolbar">
        <div className="cal-month">
          <button
            type="button"
            className="icon-btn"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
          >
            ←
          </button>
          <h2 aria-live="polite">{formatMonthTitle(cursor)}</h2>
          <button type="button" className="icon-btn" onClick={() => goToMonth(1)} aria-label="Next month">
            →
          </button>
        </div>

        <div className="cal-filter">
          <label htmlFor="kiln-filter">Kiln</label>
          <select
            id="kiln-filter"
            value={kilnId ?? ''}
            onChange={(event) => setKilnId(Number(event.target.value))}
            disabled={kilns.length === 0}
          >
            {kilns.length === 0 ? <option value="">Loading kilns…</option> : null}
            {kilns.map((kiln) => (
              <option key={kiln.id} value={kiln.id}>
                {kiln.name}
              </option>
            ))}
          </select>
          <span className="meta-line">
            <span aria-hidden="true">▪</span> firing
            <span className="cal-band" style={{ padding: '0 8px', lineHeight: '18px' }} aria-hidden="true">
              cooling
            </span>
          </span>
        </div>
      </div>

      {error ? (
        <ErrorBanner
          title="The firing calendar did not load."
          message={error.message}
          onRetry={() => {
            kilnsQuery.reload();
            firingsQuery.reload();
          }}
        />
      ) : null}

      <div className="cal-grid-wrap" aria-busy={loading ? 'true' : 'false'}>
        <div className="cal-grid" role="grid" aria-label={`${formatMonthTitle(cursor)} firing calendar`}>
          {WEEKDAY_LABELS.map((label) => (
            <div className="cal-dow" role="columnheader" key={label}>
              {label}
            </div>
          ))}

          {cells.map((cell) => {
            const items = buckets.get(cell.key);
            const isToday = cell.key === todayKey;
            const classNames = ['cal-cell'];
            if (!cell.inMonth) classNames.push('is-out');
            if (isToday) classNames.push('is-today');
            return (
              <div className={classNames.join(' ')} role="gridcell" key={cell.key}>
                <Link
                  to={`/calendar/new?date=${cell.key}${kilnId ? `&kiln=${kilnId}` : ''}`}
                  aria-label={`Schedule a firing on ${formatWeekdayDate(cell.date)}`}
                  style={{ position: 'absolute', inset: 0, zIndex: 0 }}
                >
                  <span className="sr-only">Schedule a firing on {formatWeekdayDate(cell.date)}</span>
                </Link>
                <div className="cal-date">
                  <span>{cell.date.getDate()}</span>
                  {isToday ? <span className="today-tag">Today</span> : null}
                </div>

                {items
                  ? items.bands.map((firing) => (
                      <div className="cal-band" key={`band-${firing.id}`}>
                        cooling · {firing.kiln_name.split('—')[0].trim()}
                      </div>
                    ))
                  : null}

                {items
                  ? items.blocks.map((firing) => (
                      <button
                        type="button"
                        key={`block-${firing.id}`}
                        className="cal-block"
                        style={{ position: 'relative', zIndex: 1 }}
                        onClick={() => navigate(`/calendar/${firing.id}/edit`)}
                        title={`${firing.title} — ${firing.target_cone}, ${formatMonthDayTime(
                          parseDate(firing.scheduled_start),
                        )}`}
                      >
                        <strong>{firing.target_cone}</strong>
                        <span>{firing.title}</span>
                        <span>
                          {formatTime(parseDate(firing.scheduled_start))} · {firing.kiln_name.split('—')[0].trim()}
                        </span>
                      </button>
                    ))
                  : null}
              </div>
            );
          })}
        </div>

        {!loading && firings.length === 0 && selectedKiln ? (
          <div className="cal-empty">
            <span>
              <strong>{selectedKiln.name}</strong> has no firings in {formatMonthTitle(cursor)}.
            </span>
            <Link className="link-arrow" to={`/calendar/new?kiln=${selectedKiln.id}&date=${dayKey(new Date())}`}>
              Schedule the first one <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : null}

        <div className="cal-agenda">
          {loading ? <p className="form-status">Loading firings…</p> : null}
          {!loading && agendaDays.length === 0 ? (
            <div className="cal-empty">
              <span>
                <strong>{selectedKiln ? selectedKiln.name : 'This kiln'}</strong> has no firings in{' '}
                {formatMonthTitle(cursor)}.
              </span>
              <Link
                className="link-arrow"
                to={`/calendar/new?kiln=${kilnId ?? ''}&date=${dayKey(new Date())}`}
              >
                Schedule the first one <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : null}
          {agendaDays.map((cell) => (
            <div className="agenda-day" key={cell.key}>
              <div className="agenda-date">{formatWeekdayDate(cell.date)}</div>
              {cell.items.blocks.map((firing) => (
                <button
                  type="button"
                  className="agenda-item"
                  key={`agenda-block-${firing.id}`}
                  onClick={() => navigate(`/calendar/${firing.id}/edit`)}
                >
                  <span className="agenda-title">{firing.title}</span>
                  <span className="agenda-meta">
                    {firing.kiln_name} · {firing.target_cone} · fires{' '}
                    {formatTime(parseDate(firing.scheduled_start))}, cooling until{' '}
                    {formatMonthDayTime(parseDate(firing.cooldown_end))}
                  </span>
                </button>
              ))}
              {cell.items.bands.map((firing) => (
                <div className="cal-band" key={`agenda-band-${firing.id}`} style={{ marginBottom: '6px' }}>
                  cooling · {firing.kiln_name}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
