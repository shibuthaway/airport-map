import { useEffect, useState } from 'react';
import PositionService from '../services/PositionService';
import { useMapStore } from '../store/useMapStore';

export const useIndoorPositioning = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  
  const { 
    currentFloor, nodes, edges, navigationPath, 
    navigationStart, navigationMode,
    setUserPosition, recalculatePath
  } = useMapStore();

  useEffect(() => {
    // Keep PositionService updated with the latest map graph data
    PositionService.setGraphData(currentFloor, nodes, edges, navigationPath);
  }, [currentFloor, nodes, edges, navigationPath]);

  const startTracking = async () => {
    if (!navigationStart) {
      setError("Please select a navigation start point first.");
      return false;
    }

    try {
      // Set initial position to the selected start node
      PositionService.setInitialPosition(navigationStart.x, navigationStart.y, navigationStart.floor);
      
      const success = await PositionService.start();
      if (!success) {
        setError("Sensor permissions were denied or unavailable.");
        return false;
      }

      setIsActive(true);
      setError(null);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const stopTracking = () => {
    PositionService.stop();
    setIsActive(false);
    setUserPosition(null);
  };

  useEffect(() => {
    if (!isActive) return;

    const unsubscribe = PositionService.subscribe((data) => {
      setUserPosition({
        x: data.x,
        y: data.y,
        heading: data.heading,
        isOffRoute: data.isOffRoute,
        isWalking: data.isWalking,
        floor: PositionService.currentFloor
      });

      // Automatically recalculate if off route and we have a snapped node
      // Prevent rapid recalculations by only recalculating if we actually moved significantly
      if (data.isOffRoute && data.didMove && data.snappedNode) {
        recalculatePath(data.snappedNode);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isActive, setUserPosition, recalculatePath]);

  // Auto-stop tracking if navigation is cancelled
  useEffect(() => {
    if (!navigationMode && isActive) {
      stopTracking();
      setUserPosition(null);
    }
  }, [navigationMode, isActive, setUserPosition]);

  return {
    isActive,
    error,
    startTracking,
    stopTracking
  };
};
