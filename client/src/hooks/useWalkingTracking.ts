import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const PRIVACY_RADIUS_M = 200; // 200 meters

interface WalkingTrackingState {
  isTracking: boolean;
  currentLat: number | null;
  currentLon: number | null;
  homeLat: number | null;
  homeLon: number | null;
  distanceToHome: number | null;
  isNearHome: boolean;
  hasAskedAboutPrivacy: boolean;
}

/**
 * Calculate distance between two coordinates using Haversine formula (in meters)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useWalkingTracking() {
  const { user } = useAuth();
  const [state, setState] = useState<WalkingTrackingState>({
    isTracking: false,
    currentLat: null,
    currentLon: null,
    homeLat: null,
    homeLon: null,
    distanceToHome: null,
    isNearHome: false,
    hasAskedAboutPrivacy: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const privacyAlertShownRef = useRef(false);
  const toggleLocationMutation = trpc.user.toggleLocationSharing.useMutation();
  const updateLocationMutation = trpc.user.updateLocation.useMutation();
  const setHomeMutation = trpc.user.setHomeLocation.useMutation();

  // Initialize home location from user profile
  useEffect(() => {
    if (user?.homeLatitude && user?.homeLongitude) {
      setState(prev => ({
        ...prev,
        homeLat: user.homeLatitude,
        homeLon: user.homeLongitude,
      }));
    }
  }, [user?.homeLatitude, user?.homeLongitude]);

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non disponible');
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setState(prev => ({
          ...prev,
          currentLat: latitude,
          currentLon: longitude,
          isTracking: true,
        }));

        // Update server location
        updateLocationMutation.mutate({ latitude, longitude });

        // Set up continuous tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setState(prev => ({
              ...prev,
              currentLat: latitude,
              currentLon: longitude,
            }));

            // Update server location every 30 seconds
            updateLocationMutation.mutate({ latitude, longitude });
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast.error('Erreur de géolocalisation');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Permission de géolocalisation refusée');
      }
    );
  }, [updateLocationMutation]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isTracking: false,
      hasAskedAboutPrivacy: false,
    }));
    privacyAlertShownRef.current = false;
    toggleLocationMutation.mutate({ isActive: false });
  }, [toggleLocationMutation]);

  // Monitor distance to home and show privacy alert
  useEffect(() => {
    if (!state.currentLat || !state.currentLon || !state.homeLat || !state.homeLon) {
      return;
    }

    const distance = calculateDistance(
      state.currentLat,
      state.currentLon,
      state.homeLat,
      state.homeLon
    );

    setState(prev => ({
      ...prev,
      distanceToHome: distance,
      isNearHome: distance <= PRIVACY_RADIUS_M,
    }));

    // Show privacy alert when approaching home
    if (distance <= PRIVACY_RADIUS_M && !privacyAlertShownRef.current && state.isTracking) {
      privacyAlertShownRef.current = true;
      setState(prev => ({
        ...prev,
        hasAskedAboutPrivacy: true,
      }));
    }
  }, [state.currentLat, state.currentLon, state.homeLat, state.homeLon, state.isTracking]);

  // Handle privacy confirmation
  const confirmPrivacyStop = useCallback(async () => {
    await stopTracking();
    toast.success('Partage de position désactivé pour protéger votre vie privée');
  }, [stopTracking]);

  // Handle privacy cancellation (continue sharing)
  const continueSharing = useCallback(() => {
    privacyAlertShownRef.current = false;
    setState(prev => ({
      ...prev,
      hasAskedAboutPrivacy: false,
    }));
  }, []);

  // Set home location
  const setHomeLocation = useCallback(async (latitude: number, longitude: number) => {
    setState(prev => ({
      ...prev,
      homeLat: latitude,
      homeLon: longitude,
    }));
    await setHomeMutation.mutateAsync({ latitude, longitude });
    toast.success('Domicile défini');
  }, [setHomeMutation]);

  return {
    ...state,
    startTracking,
    stopTracking,
    confirmPrivacyStop,
    continueSharing,
    setHomeLocation,
  };
}
