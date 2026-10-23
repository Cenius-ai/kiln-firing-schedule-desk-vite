import { useState } from 'react';
import FormField, { fieldProps } from './FormField';
import { CONE_OPTIONS } from './LoadSheetForm';
import { formatMonthDayTime, parseDate } from '../lib/date';

function cooldownPreview(values) {
  const start = parseDate(values.scheduled_start);
  if (!start) return null;
  const duration = Number(values.duration_hours);
  const cooldown = Number(values.cooldown_hours);
  if (!Number.isFinite(duration) || !Number.isFinite(cooldown)) return null;
  const cooldownStart = new Date(start.getTime() + duration * 3600000);
  const cooldownEnd = new Date(cooldownStart.getTime() + cooldown * 3600000);
  return { start, cooldownStart, cooldownEnd };
}

export default function FiringForm({
  kilns,
  initialValues,
  submitLabel = 'Save firing',
  busyLabel = 'Saving…',
  submitting = false,
  fieldErrors = {},
  formError = '',
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function validate(candidate) {
    const next = {};
    if (!candidate.kiln_id) next.kiln_id = 'Choose a kiln.';

    const title = candidate.title.trim();
    if (!title) next.title = 'Name the firing so the studio knows what is in the kiln.';
    else if (title.length < 2 || title.length > 80) next.title = 'Use between 2 and 80 characters.';

    if (!candidate.scheduled_start) next.scheduled_start = 'Pick the start date and time.';
    else if (!parseDate(candidate.scheduled_start)) next.scheduled_start = 'Use a valid date and time.';

    const duration = Number(candidate.duration_hours);
    if (!Number.isFinite(duration) || duration < 0.5 || duration > 48) {
      next.duration_hours = 'Duration must be between 0.5 and 48 hours.';
    }

    const cooldown = Number(candidate.cooldown_hours);
    if (!Number.isFinite(cooldown) || cooldown < 0 || cooldown > 96) {
      next.cooldown_hours = 'Cooldown must be between 0 and 96 hours.';
    }

    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    await onSubmit({
      kiln_id: Number(values.kiln_id),
      title: values.title.trim(),
      target_cone: values.target_cone,
      scheduled_start: values.scheduled_start,
      duration_hours: Number(values.duration_hours),
      cooldown_hours: Number(values.cooldown_hours),
      notes: values.notes.trim(),
    });
  }

  const errFor = (field) => errors[field] || fieldErrors[field] || '';
  const preview = cooldownPreview(values);

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <FormField id="kiln_id" label="Kiln" error={errFor('kiln_id')}>
        <select
          {...fieldProps('kiln_id', errFor('kiln_id'))}
          value={values.kiln_id}
          onChange={(event) => update('kiln_id', event.target.value)}
          disabled={submitting}
        >
          <option value="">Select a kiln…</option>
          {kilns.map((kiln) => (
            <option key={kiln.id} value={kiln.id}>
              {kiln.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="title" label="Firing title" hint="2–80 characters." error={errFor('title')}>
        <input
          {...fieldProps('title', errFor('title'))}
          type="text"
          value={values.title}
          onChange={(event) => update('title', event.target.value)}
          placeholder="Glaze — dinnerware series"
          maxLength={80}
          disabled={submitting}
          autoFocus
        />
      </FormField>

      <FormField id="target_cone" label="Target cone" error={errFor('target_cone')}>
        <select
          {...fieldProps('target_cone', errFor('target_cone'))}
          value={values.target_cone}
          onChange={(event) => update('target_cone', event.target.value)}
          disabled={submitting}
        >
          {CONE_OPTIONS.map((cone) => (
            <option key={cone} value={cone}>
              {cone}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="scheduled_start" label="Start date and time" error={errFor('scheduled_start')}>
        <input
          {...fieldProps('scheduled_start', errFor('scheduled_start'))}
          type="datetime-local"
          value={values.scheduled_start}
          onChange={(event) => update('scheduled_start', event.target.value)}
          disabled={submitting}
        />
      </FormField>

      <FormField
        id="duration_hours"
        label="Firing duration (hours)"
        hint="0.5–48 hours. Counts from the start time."
        error={errFor('duration_hours')}
      >
        <input
          {...fieldProps('duration_hours', errFor('duration_hours'))}
          type="number"
          inputMode="decimal"
          min={0.5}
          max={48}
          step={0.5}
          value={values.duration_hours}
          onChange={(event) => update('duration_hours', event.target.value)}
          disabled={submitting}
        />
      </FormField>

      <FormField
        id="cooldown_hours"
        label="Cooldown (hours)"
        hint="0–96 hours. The kiln is blocked while it cools."
        error={errFor('cooldown_hours')}
      >
        <input
          {...fieldProps('cooldown_hours', errFor('cooldown_hours'))}
          type="number"
          inputMode="decimal"
          min={0}
          max={96}
          step={0.5}
          value={values.cooldown_hours}
          onChange={(event) => update('cooldown_hours', event.target.value)}
          disabled={submitting}
        />
      </FormField>

      <FormField id="notes" label="Notes" hint="Optional — reduction schedule, soak, wadding." error={errFor('notes')} wide>
        <textarea
          {...fieldProps('notes', errFor('notes'))}
          value={values.notes}
          onChange={(event) => update('notes', event.target.value)}
          maxLength={500}
          disabled={submitting}
          placeholder="Body reduction at 950 °C for 45 minutes, then neutral to cone."
        />
      </FormField>

      {preview ? (
        <div className="form-actions" style={{ paddingTop: 0 }}>
          <p className="form-status">
            Fires {formatMonthDayTime(preview.start)} → {formatMonthDayTime(preview.cooldownStart)} · cooling window
            closes {formatMonthDayTime(preview.cooldownEnd)}
          </p>
        </div>
      ) : null}

      {formError ? (
        <div className="form-actions">
          <div className="banner" role="alert" style={{ width: '100%' }}>
            <span>{formError}</span>
          </div>
        </div>
      ) : null}

      <div className="form-actions">
        <button className="btn btn-accent" type="submit" disabled={submitting}>
          {submitting ? busyLabel : submitLabel}
        </button>
        <button className="btn btn-quiet" type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
