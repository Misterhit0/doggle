import { useRealTimeGeolocation } from '@/hooks/useRealTimeGeolocation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, MapPin, Loader2 } from 'lucide-react';

interface GeolocationStatusProps {
  onLocationReady?: () => void;
  compact?: boolean;
}

export function GeolocationStatus({ onLocationReady, compact = false }: GeolocationStatusProps) {
  const geolocation = useRealTimeGeolocation({
    enabled: true,
    updateIntervalMs: 30000, // 30 secondes
  });

  const handleRequestLocation = async () => {
    await geolocation.requestGeolocationPermission();
    if (geolocation.latitude && geolocation.longitude) {
      onLocationReady?.();
    }
  };

  // Mode compact - juste un indicateur
  if (compact) {
    if (geolocation.error) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle size={16} />
          <span>Géolocalisation désactivée</span>
        </div>
      );
    }

    if (geolocation.isWatching) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 text-accent rounded-lg text-sm">
          <MapPin size={16} className="animate-pulse" />
          <span>Localisation active</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm">
        <MapPin size={16} />
        <span>Localisation inactive</span>
      </div>
    );
  }

  // Mode complet - card avec détails
  return (
    <Card className="p-4 bg-card">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {geolocation.loading ? (
              <Loader2 size={20} className="text-accent animate-spin" />
            ) : geolocation.isWatching ? (
              <MapPin size={20} className="text-accent animate-pulse" />
            ) : (
              <MapPin size={20} className="text-muted-foreground" />
            )}
            <h3 className="font-semibold text-foreground">Géolocalisation</h3>
          </div>
          {geolocation.isWatching && (
            <span className="text-xs font-semibold px-2 py-1 bg-accent/20 text-accent rounded-full">
              Actif
            </span>
          )}
        </div>

        {/* Status */}
        {geolocation.error ? (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle size={16} />
              {geolocation.error}
            </p>
          </div>
        ) : geolocation.latitude && geolocation.longitude ? (
          <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Latitude :</span> {geolocation.latitude.toFixed(6)}
            </p>
            <p className="text-sm text-foreground">
              <span className="font-semibold">Longitude :</span> {geolocation.longitude.toFixed(6)}
            </p>
            {geolocation.accuracy && (
              <p className="text-xs text-muted-foreground mt-2">
                Précision : ±{Math.round(geolocation.accuracy)}m
              </p>
            )}
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-2">
          {!geolocation.isWatching && !geolocation.error ? (
            <Button
              onClick={handleRequestLocation}
              disabled={geolocation.loading}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold gap-2"
            >
              {geolocation.loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Activation...
                </>
              ) : (
                <>
                  <MapPin size={16} />
                  Activer la géolocalisation
                </>
              )}
            </Button>
          ) : null}

          {geolocation.isWatching && (
            <Button
              onClick={geolocation.stopWatching}
              variant="outline"
              className="flex-1 gap-2"
            >
              Désactiver
            </Button>
          )}
        </div>

        {/* Info */}
        {geolocation.isWatching && (
          <p className="text-xs text-muted-foreground text-center">
            Mise à jour automatique toutes les 30 secondes
          </p>
        )}
      </div>
    </Card>
  );
}
