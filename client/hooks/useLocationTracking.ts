// Create: client/hooks/useLocationTracking.ts

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export function useLocationTracking(enableTracking: boolean = true) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get initial location
  useEffect(() => {
    if (!enableTracking) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setError('Location permission denied');
          setLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          timestamp: currentLocation.timestamp,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error getting location:', err);
        setError('Failed to get location');
        setLoading(false);
      }
    })();
  }, [enableTracking]);

  // Watch location changes (updates every ~100m or 30 seconds)
  useEffect(() => {
    if (!enableTracking || !location) return;

    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100, // Update every 100 meters
            timeInterval: 30000,   // Or every 30 seconds
          },
          (newLocation) => {
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy,
              timestamp: newLocation.timestamp,
            });
          }
        );
      } catch (err) {
        console.error('Error watching location:', err);
      }
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enableTracking, location]);

  const refreshLocation = useCallback(async () => {
    setLoading(true);
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        timestamp: currentLocation.timestamp,
      });
      setError(null);
    } catch (err) {
      console.error('Error refreshing location:', err);
      setError('Failed to refresh location');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    location,
    error,
    loading,
    refreshLocation,
  };
}
