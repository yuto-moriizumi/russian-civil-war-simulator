'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '../store/useGameStore';
import CombatPopup from '../components/CombatPopup';
import EventsModal from '../components/EventsModal';
import TheaterPanel from '../components/TheaterPanel';
import NotificationToast from '../components/NotificationToast';
import TopBar from '../components/TopBar';
import MissionPanel from '../components/MissionPanel';
import ProductionQueuePanel from '../components/ProductionQueuePanel';
import CountrySidebar from '../components/CountrySidebar';

// Dynamic import for GameMap to avoid SSR issues with MapLibre
const GameMap = dynamic(() => import('../components/GameMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-stone-900">
      <div className="text-stone-400">Loading map...</div>
    </div>
  ),
});

export default function MainScreen() {
  // Store selectors
  const country = useGameStore(state => state.selectedCountry);
  const mapDataLoaded = useGameStore(state => state.mapDataLoaded);
  const lastSaveTime = useGameStore(state => state.lastSaveTime);
  
  // Local state for saved indicator
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  
  // Store lastSaveTime timestamp in a ref to compare and trigger indicator
  // Initialize with current lastSaveTime to avoid showing indicator on mount
  const prevSaveTimeRef = useRef<number | null>(lastSaveTime?.getTime() || null);

  // Show "Saved!" indicator when lastSaveTime changes
  // This setState is intentional - we need to show a UI indicator in response to prop change
  useEffect(() => {
    const currentSaveTime = lastSaveTime?.getTime() || null;
    
    // Only trigger if save time actually changed (compare timestamps, not object references)
    if (currentSaveTime && currentSaveTime !== prevSaveTimeRef.current) {
      prevSaveTimeRef.current = currentSaveTime;
      
      // Only show the indicator if the save happened in the last 5 seconds
      // to avoid showing it on mount for old rehydrated saves
      const isRecent = (Date.now() - currentSaveTime) < 5000;
      
      if (isRecent) {
        // Schedule state update to avoid synchronous setState in effect
        const showTimer = setTimeout(() => {
          setShowSavedIndicator(true);
        }, 0);
        const hideTimer = setTimeout(() => setShowSavedIndicator(false), 2000);
        return () => {
          clearTimeout(showTimer);
          clearTimeout(hideTimer);
        };
      }
    }
  }, [lastSaveTime]);

  if (!country) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0">
        {mapDataLoaded ? (
          <GameMap />
        ) : (
          <div 
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundColor: '#2d3a2d',
              backgroundImage: `
                radial-gradient(circle at 30% 40%, rgba(60,80,60,0.8) 0%, transparent 50%),
                radial-gradient(circle at 70% 60%, rgba(80,100,80,0.6) 0%, transparent 40%),
                radial-gradient(circle at 50% 30%, rgba(40,60,40,0.7) 0%, transparent 60%),
                linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))
              `,
            }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-stone-400">Loading map data...</div>
            </div>
          </div>
        )}
      </div>

      {/* Top Bar */}
      <TopBar showSavedIndicator={showSavedIndicator} />

      {/* Country Sidebar */}
      <CountrySidebar />

      {/* Production Queue Panel */}
      <ProductionQueuePanel viewOnly={true} />

      {/* Mission Panel */}
      <MissionPanel />

      {/* Theater Panel - now at bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-fit max-w-[95vw]">
        <TheaterPanel />
      </div>

      {/* Combat Popup */}
      <CombatPopup />

      {/* Events Modal */}
      <EventsModal />

      {/* Notification Toasts */}
      <NotificationToast />
    </div>
  );
}
