export default function ErrorBanner({ title = 'Could not load this view.', message, onRetry }) {
  return (
    <div className="banner" role="alert">
      <span>
        <strong>{title}</strong>
        {message ? ` ${message}` : null}
      </span>
      {onRetry ? (
        <button type="button" className="btn btn-small btn-quiet" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
