import React, { useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import Sidebar from './components/Sidebar/Sidebar';
import AirportMap from './components/AirportMap/AirportMap';
import Legend from './components/Legend/Legend';
import Popup from './components/Popup/Popup';
import MapHeader from './components/MapHeader/MapHeader';
import { useMapStore } from './store/useMapStore';

export default function App() {
  const { theme } = useMapStore();

  useEffect(() => {
    const activeTheme = localStorage.getItem('theme') || 'dark';
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors duration-500">
      {/* 1. Preloader */}
      <LoadingScreen />

      {/* 2. Interactive Sliding Navigation Drawer */}
      <div className="absolute md:relative z-40 h-full pointer-events-none md:pointer-events-auto">
        <div className="h-full pointer-events-auto">
          <Sidebar />
        </div>
      </div>

      {/* 3. Map Viewport & Overlays Container */}
      <div className="flex-1 h-full w-full relative flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Dashboard Bar */}
        <MapHeader />



        {/* Floating Bottom-Right Explanatory Map Legend */}
        <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <Legend />
          </div>
        </div>

        {/* 4. Canvas mapping core */}
        <div className="flex-1 w-full relative z-10 min-h-0">
          <AirportMap />
        </div>

        {/* 5. Point of Interest Detailed popup */}
        <Popup />
      </div>
    </div>
  );
}
