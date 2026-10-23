import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AppShell from './components/AppShell';
import Calendar from './screens/Calendar';
import Dashboard from './screens/Dashboard';
import FiringEditor from './screens/FiringEditor';
import GlazeDetail from './screens/GlazeDetail';
import GlazeEditor from './screens/GlazeEditor';
import Glazes from './screens/Glazes';
import LoadSheetDetail from './screens/LoadSheetDetail';
import LoadSheetEditor from './screens/LoadSheetEditor';
import LoadSheets from './screens/LoadSheets';
import Login from './screens/Login';
import NotFound from './screens/NotFound';
import Profile from './screens/Profile';

function BootScreen() {
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <span className="wordmark">KILN</span>
      <span className="sr-only">Loading the studio desk…</span>
    </div>
  );
}

function ProtectedShell() {
  const { member, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <BootScreen />;
  if (!member) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: from === '/' ? '/' : from }} />;
  }
  return <AppShell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/load-sheets" element={<LoadSheets />} />
            <Route path="/load-sheets/new" element={<LoadSheetEditor mode="create" />} />
            <Route path="/load-sheets/:sheetId" element={<LoadSheetDetail />} />
            <Route path="/load-sheets/:sheetId/edit" element={<LoadSheetEditor mode="edit" />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/calendar/new" element={<FiringEditor mode="create" />} />
            <Route path="/calendar/:firingId/edit" element={<FiringEditor mode="edit" />} />
            <Route path="/glazes" element={<Glazes />} />
            <Route path="/glazes/new" element={<GlazeEditor mode="create" />} />
            <Route path="/glazes/:tileId" element={<GlazeDetail />} />
            <Route path="/glazes/:tileId/edit" element={<GlazeEditor mode="edit" />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
