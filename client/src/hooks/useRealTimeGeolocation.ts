import { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  isWatching: boolean;
}

interface UseRealTimeGeolocationOptions {
  enabled?: boolean;
  updateIntervalMs?: number;
  highAccuracy?: boolean;
}

/**
 * Hook pour tracker la géolocalisation en temps réel et mettre à jour le serveur
 * Utilise navigator.geolocation.watchPosition pour les mises à jour continues
 */
export function useRealTimeGeolocation(options: UseRealTimeGeolocationOptions = {}) {
  const {
    enabled = true,
    updateIntervalMs = 30000, // 30 secondes par défaut
    highAccuracy = true,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
    isWatching: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const updateLocationMutation = trpc.user.updateLocation.useMutation();

  // Fonction pour mettre à jour la localisation sur le serveur
  const updateLocationOnServer = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        await updateLocationMutation.mutateAsync({
          latitude,
          longitude,
        });
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la localisation:', error);
      }
    },
    [updateLocationMutation]
  );

  // Fonction pour demander la permission de géolocalisation
  const requestGeolocationPermission = useCallback(async () => {
    if (!enabled || !navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Géolocalisation non disponible sur cet appareil',
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Demander une localisation initiale
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          setState(prev => ({
            ...prev,
            latitude,
            longitude,
            accuracy,
            loading: false,
            error: null,
          }));

          // Mettre à jour le serveur
          updateLocationOnServer(latitude, longitude);

          // Démarrer le watch après la première localisation
          startWatching();
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Délai d\'attente dépassé';
              break;
          }

          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erreur lors de la demande de géolocalisation',
      }));
    }
  }, [enabled, highAccuracy, updateLocationOnServer]);

  // Fonction pour démarrer le suivi continu
  const startWatching = useCallback(() => {
    if (!enabled || !navigator.geolocation || watchIdRef.current !== null) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();

        setState(prev => ({
          ...prev,
          latitude,
          longitude,
          accuracy,
          isWatching: true,
        }));

        // Mettre à jour le serveur seulement si l'intervalle est respecté
        if (now - lastUpdateRef.current >= updateIntervalMs) {
          updateLocationOnServer(latitude, longitude);
          lastUpdateRef.current = now;
        }
      },
      (error) => {
        console.error('Erreur du watch de géolocalisation:', error);
        setState(prev => ({
          ...prev,
          isWatching: false,
        }));
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 10000,
        maximumAge: 5000, // Accepter une position de max 5 secondes
      }
    );
  }, [enabled, highAccuracy, updateIntervalMs, updateLocationOnServer]);

  // Fonction pour arrêter le suivi
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setState(prev => ({
        ...prev,
        isWatching: false,
      }));
    }
  }, []);

  // Nettoyer le watch au démontage
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    ...state,
    requestGeolocationPermission,
    startWatching,
    stopWatching,
    isUpdating: updateLocationMutation.isPending,
  };
}
