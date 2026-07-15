import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import Sidebar from './components/Sidebar/Sidebar';
import AirportMap from './components/AirportMap/AirportMap';
import Popup from './components/Popup/Popup';
import MapHeader from './components/MapHeader/MapHeader';
import Login from './components/Auth/Login';
import SuperAdminDashboard from './components/Admin/SuperAdminDashboard';
import { useMapStore } from './store/useMapStore';
import ToastContainer from './components/Toast/ToastContainer';

// ── Error Boundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0f1e 0%, #0c1a35 100%)',
            color: '#f1f5f9',
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            textAlign: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '80%', margin: 0, wordBreak: 'break-all' }}>
            {this.state.error?.toString() || 'An unexpected error occurred.'}
          </p>
          {this.state.errorInfo && (
            <pre style={{ textAlign: 'left', background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.75rem', overflowX: 'auto', maxWidth: '90%', color: '#ef4444' }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 2rem',
              background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Map Layout ─────────────────────────────────────────────────────────────────
const MapLayout = () => {
  const floors = useMapStore(state => state.floors);
  const nodes = useMapStore(state => state.nodes);
  const edges = useMapStore(state => state.edges);
  const pois = useMapStore(state => state.pois);
  const currentFloor = useMapStore(state => state.currentFloor);
  const currentBuilding = useMapStore(state => state.currentBuilding);
  const isFullScreen = useMapStore(state => state.isFullScreen);
  const dataLoaded = useMapStore(state => state.dataLoaded);
  const loadMapData = useMapStore(state => state.loadMapData);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Auto-sync active building state to the local cache so modifications (adding a floor/node)
  // are never lost when switching back and forth between terminals.
  useEffect(() => {
    if (dataLoaded && currentBuilding) {
      useMapStore.setState(state => {
        const newCache = { ...state.buildingCache };
        newCache[currentBuilding] = {
          floors: state.floors,
          nodes: state.nodes,
          edges: state.edges,
          pois: state.pois,
          topFloorId: state.currentFloor
        };
        return { buildingCache: newCache };
      });
    }
  }, [floors, nodes, edges, pois, currentFloor, currentBuilding, dataLoaded]);

  return (
    <div className="w-screen h-[100dvh] flex md:p-4 md:gap-4 overflow-hidden bg-[#f5f5f7] dark:bg-[#000000] font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors duration-500 relative">
      {/* 1. Preloader */}
      <LoadingScreen />

      {/* 2. Sidebar/Bottom-Sheet Navigation */}
      {dataLoaded && (
        <div className={`absolute md:relative z-40 h-full pointer-events-none md:pointer-events-auto ${isFullScreen ? 'hidden' : ''} md:h-[calc(100dvh-2rem)] md:shrink-0`}>
          <div className="h-full pointer-events-auto">
            <Sidebar />
          </div>
        </div>
      )}

      {/* 3. Map + Header */}
      {dataLoaded && (
        <div className="flex-1 h-full w-full relative flex flex-col min-w-0 overflow-hidden md:rounded-[2rem] md:shadow-2xl md:border border-black/5 dark:border-white/10 bg-white dark:bg-[#0a0a0a]">
          {/* Top Header */}
          <MapHeader />

          {/* Map Canvas */}
          <div className="flex-1 w-full relative z-10 min-h-0 md:rounded-b-3xl overflow-hidden">
            <AirportMap />
          </div>

          {/* POI Detail Popup */}
          <Popup />
        </div>
      )}
    </div>
  );
};

// ── Auth-aware redirect handler (shown during logout/token checks) ──────────────
const AuthRedirectScreen = () => (
  <div
    style={{
      minHeight: '100dvh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0c1a35 100%)',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 48,
          height: 48,
          border: '3px solid rgba(14,165,233,0.3)',
          borderTop: '3px solid #0ea5e9',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#94a3b8', fontFamily: 'system-ui', fontSize: '0.875rem', margin: 0 }}>
        Please wait...
      </p>
    </div>
  </div>
);

// ── Protected Route: only accessible when NOT logged in ───────────────────────
const GuestOnly = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('ap_token');
    const user = useMapStore.getState().user;
    if (token) {
      if (user?.role === 'superadmin') {
        setRedirect('/superadmin');
      } else if (user?.project_id) {
        setRedirect(`/?project=${user.project_id}&mode=admin`);
      } else {
        setRedirect('/');
      }
    }
    setChecking(false);
  }, []);

  if (checking) return <AuthRedirectScreen />;
  if (redirect) return <Navigate to={redirect} replace />;
  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    const activeTheme = localStorage.getItem('theme') || 'dark';
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // PWA-like meta: prevent overscroll bounce on iOS
    document.body.style.overscrollBehavior = 'none';
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MapLayout />} />
        <Route path="/map/:slug" element={<MapLayout />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route path="/superadmin" element={<SuperAdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </ErrorBoundary>
  );
}
