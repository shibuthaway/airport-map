import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import Sidebar from './components/Sidebar/Sidebar';
import AirportMap from './components/AirportMap/AirportMap';
import Popup from './components/Popup/Popup';
import MapHeader from './components/MapHeader/MapHeader';
import Login from './components/Auth/Login';
import SuperAdminDashboard from './components/Admin/SuperAdminDashboard';
import { useMapStore } from './store/useMapStore';
import OfflineBanner from './components/OfflineBanner/OfflineBanner';
import ToastContainer from './components/Toast/ToastContainer';

const MapLayout = () => {
  const { isFullScreen, dataLoaded, loadMapData } = useMapStore();

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  return (
    <div className="w-screen h-[100dvh] flex md:p-4 md:gap-4 overflow-hidden bg-[#f5f5f7] dark:bg-[#000000] font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors duration-500 relative">
      {/* Offline indicator */}
      <OfflineBanner />
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
    <>
      <Routes>
        <Route path="/" element={<MapLayout />} />
        <Route path="/map/:slug" element={<MapLayout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/superadmin" element={<SuperAdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
