import { useState } from 'react';
import FormField, { fieldProps } from './FormField';

export const CONE_OPTIONS = ['Cone 04', 'Cone 06', 'Cone 5', 'Cone 6', 'Cone 8', 'Cone 10'];
export const SHEET_STATUSES = [
  { value: 'draft', label: 'Draft — still planning' },
  { value: 'loaded', label: 'Loaded — wares in the kiln' },
  { value: 'fired', label: 'Fired — unloaded and logged' },
];

export default function LoadSheetForm({
  kilns,
  initialValues,
  submitLabel = 'Save load sheet',
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
    if (!candidate.kiln_id) next.kiln_id = 'Choose the kiln this load belongs to.';

    const title = candidate.title.trim();
    if (!title) next.title = 'Give the sheet a title.';
    else if (title.length < 2 || title.length > 80) next.title = 'Use between 2 and 80 characters.';

    const temp = Number(candidate.cone_temp_c);
    if (!Number.isFinite(temp) || temp < 500 || temp > 1400) {
      next.cone_temp_c = 'Cone temperature must be between 500 and 1400 °C.';
    }

    const wares = Number(candidate.ware_count);
    if (!Number.isInteger(wares) || wares < 1 || wares > 200) {
      next.ware_count = 'Ware count must be a whole number between 1 and 200.';
    }

    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstField = Object.keys(nextErrors)[0];
      document.getElementById(firstField)?.focus();
      return;
    }

    await onSubmit({
      kiln_id: Number(values.kiln_id),
      title: values.title.trim(),
      cone: values.cone,
      cone_temp_c: Number(values.cone_temp_c),
      ware_count: Number(values.ware_count),
      status: values.status,
      notes: values.notes.trim(),
    });
  }

  const errFor = (field) => errors[field] || fieldErrors[field] || '';

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

      <FormField
        id="title"
        label="Sheet title"
        hint="2–80 characters, e.g. “Members' mug bisque”."
        error={errFor('title')}
      >
        <input
          {...fieldProps('title', errFor('title'))}
          type="text"
          value={values.title}
          onChange={(event) => update('title', event.target.value)}
          placeholder="Members' mug bisque"
          maxLength={80}
          disabled={submitting}
          autoFocus
        />
      </FormField>

      <FormField id="cone" label="Target cone" error={errFor('cone')}>
        <select
          {...fieldProps('cone', errFor('cone'))}
          value={values.cone}
          onChange={(event) => update('cone', event.target.value)}
          disabled={submitting}
        >
          {CONE_OPTIONS.map((cone) => (
            <option key={cone} value={cone}>
              {cone}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        id="cone_temp_c"
        label="Cone temperature (°C)"
        hint="500–1400 °C. Cone 6 lands near 1220 °C."
        error={errFor('cone_temp_c')}
      >
        <input
          {...fieldProps('cone_temp_c', errFor('cone_temp_c'))}
          type="number"
          inputMode="numeric"
          min={500}
          max={1400}
          step={1}
          value={values.cone_temp_c}
          onChange={(event) => update('cone_temp_c', event.target.value)}
          disabled={submitting}
        />
      </FormField>

      <FormField id="ware_count" label="Ware count" hint="1–200 pieces." error={errFor('ware_count')}>
        <input
          {...fieldProps('ware_count', errFor('ware_count'))}
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          step={1}
          value={values.ware_count}
          onChange={(event) => update('ware_count', event.target.value)}
          disabled={submitting}
        />
      </FormField>

      <FormField id="status" label="Status" error={errFor('status')}>
        <select
          {...fieldProps('status', errFor('status'))}
          value={values.status}
          onChange={(event) => update('status', event.target.value)}
          disabled={submitting}
        >
          {SHEET_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="notes" label="Notes" hint="Optional — shelf quirks, wadding, glaze batch." error={errFor('notes')} wide>
        <textarea
          {...fieldProps('notes', errFor('notes'))}
          value={values.notes}
          onChange={(event) => update('notes', event.target.value)}
          maxLength={500}
          disabled={submitting}
          placeholder="Middle shelf runs hot; leave the top spy hole plugged."
        />
      </FormField>

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
