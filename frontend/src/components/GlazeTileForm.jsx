import { useState } from 'react';
import FormField, { fieldProps } from './FormField';
import { CONE_OPTIONS } from './LoadSheetForm';

export const SURFACES = [
  { value: 'glossy', label: 'Glossy — mirror surface' },
  { value: 'satin', label: 'Satin — soft sheen' },
  { value: 'matte', label: 'Matte — dry surface' },
];

export const RATINGS = [
  { value: '5', label: '5 — keeper, test again' },
  { value: '4', label: '4 — promising' },
  { value: '3', label: '3 — usable' },
  { value: '2', label: '2 — needs work' },
  { value: '1', label: '1 — discard' },
];

export default function GlazeTileForm({
  initialValues,
  submitLabel = 'Save test tile',
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
    const name = candidate.name.trim();
    if (!name) next.name = 'Name the glaze so the studio can find the tile.';
    else if (name.length < 2 || name.length > 60) next.name = 'Use between 2 and 60 characters.';
    if (!candidate.tested_on) next.tested_on = 'Pick the date this tile came out of the kiln.';
    if (candidate.result_notes.length > 280) next.result_notes = 'Keep the result note under 280 characters.';
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
      name: values.name.trim(),
      cone: values.cone,
      surface: values.surface,
      color_hex: values.color_hex,
      rating: Number(values.rating),
      result_notes: values.result_notes.trim(),
      tested_on: values.tested_on,
    });
  }

  const errFor = (field) => errors[field] || fieldErrors[field] || '';

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <FormField id="name" label="Glaze name" hint="2–60 characters." error={errFor('name')}>
        <input
          {...fieldProps('name', errFor('name'))}
          type="text"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          placeholder="Shino Standard"
          maxLength={60}
          disabled={submitting}
          autoFocus
        />
      </FormField>

      <FormField id="cone" label="Tested at cone" error={errFor('cone')}>
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

      <FormField id="surface" label="Surface" error={errFor('surface')}>
        <select
          {...fieldProps('surface', errFor('surface'))}
          value={values.surface}
          onChange={(event) => update('surface', event.target.value)}
          disabled={submitting}
        >
          {SURFACES.map((surface) => (
            <option key={surface.value} value={surface.value}>
              {surface.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="rating" label="Rating" error={errFor('rating')}>
        <select
          {...fieldProps('rating', errFor('rating'))}
          value={values.rating}
          onChange={(event) => update('rating', event.target.value)}
          disabled={submitting}
        >
          {RATINGS.map((rating) => (
            <option key={rating.value} value={rating.value}>
              {rating.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        id="color_hex"
        label="Tile colour"
        hint="The swatch stands in for the tile photo."
        error={errFor('color_hex')}
      >
        <input
          {...fieldProps('color_hex', errFor('color_hex'))}
          type="color"
          value={values.color_hex}
          onChange={(event) => update('color_hex', event.target.value)}
          disabled={submitting}
        />
      </FormField>

      <FormField id="tested_on" label="Tested on" error={errFor('tested_on')}>
        <input
          {...fieldProps('tested_on', errFor('tested_on'))}
          type="date"
          value={values.tested_on}
          onChange={(event) => update('tested_on', event.target.value)}
          disabled={submitting}
        />
      </FormField>

      <FormField
        id="result_notes"
        label="Result note"
        hint={`Up to 280 characters — ${values.result_notes.length} used.`}
        error={errFor('result_notes')}
        wide
      >
        <textarea
          {...fieldProps('result_notes', errFor('result_notes'))}
          value={values.result_notes}
          onChange={(event) => update('result_notes', event.target.value)}
          maxLength={280}
          disabled={submitting}
          placeholder="Warm orange-peel surface, breaks cream over rims and handles."
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
