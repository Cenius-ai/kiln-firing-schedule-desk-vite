export default function FormField({ id, label, hint, error, wide = false, children }) {
  return (
    <div className={wide ? 'field field--wide' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span className="field-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function fieldProps(baseId, error, hint) {
  return {
    id: baseId,
    name: baseId,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `${baseId}-error` : hint ? `${baseId}-hint` : undefined,
  };
}
