import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Kiln Firing Schedule Desk` : 'Kiln Firing Schedule Desk';
  }, [title]);
}
