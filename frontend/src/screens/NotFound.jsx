import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Not found');
  return (
    <div className="empty-state" style={{ marginTop: 'var(--s7)' }}>
      <span className="eyebrow">404</span>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>That page is not on the desk.</h1>
      <p>The link may be stale. The dashboard lists everything that is still on the schedule.</p>
      <Link className="btn btn-small" to="/dashboard">
        Back to the dashboard <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
