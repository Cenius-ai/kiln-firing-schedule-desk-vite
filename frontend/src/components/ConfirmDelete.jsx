import { useState } from 'react';

export default function ConfirmDelete({
  label = 'Delete',
  question = 'Delete this record?',
  busyLabel = 'Deleting…',
  onConfirm,
  className = 'btn btn-small btn-danger',
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (failure) {
      setError(failure?.message || 'Could not delete this record.');
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" className={className} onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }

  return (
    <span className="confirm-row" role="group" aria-label="Confirm deletion">
      <p>{question}</p>
      <button type="button" className="btn btn-small btn-danger" onClick={handleConfirm} disabled={busy}>
        {busy ? busyLabel : 'Yes, delete'}
      </button>
      <button
        type="button"
        className="btn btn-small"
        onClick={() => {
          setConfirming(false);
          setError('');
        }}
        disabled={busy}
      >
        Cancel
      </button>
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
