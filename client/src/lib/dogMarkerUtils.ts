/**
 * Utility functions to create custom dog markers for Google Maps
 */

export interface DogMarkerOptions {
  photoUrl?: string | null;
  dogName: string;
  ownerName: string;
  size?: number;
}

/**
 * Create a custom marker icon with a dog photo or avatar
 * Returns a DataURL that can be used as a marker icon
 */
export async function createDogMarkerIcon(options: DogMarkerOptions): Promise<string> {
  const { photoUrl, dogName, ownerName, size = 40 } = options;

  // Create canvas for the marker
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return getDefaultMarkerIcon();
  }

  // Set canvas size with padding for border and shadow
  const padding = 4;
  const totalSize = size + padding * 2;
  canvas.width = totalSize;
  canvas.height = totalSize;

  // Draw shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.arc(totalSize / 2, totalSize / 2 + 2, size / 2 + 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw white background circle
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(totalSize / 2, totalSize / 2, size / 2 + 1, 0, Math.PI * 2);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = '#FF69B4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(totalSize / 2, totalSize / 2, size / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Draw image or fallback avatar
  if (photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = photoUrl;
      });

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(totalSize / 2, totalSize / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw image
      const imgSize = size - 4;
      ctx.drawImage(
        img,
        totalSize / 2 - imgSize / 2,
        totalSize / 2 - imgSize / 2,
        imgSize,
        imgSize
      );

      ctx.restore();
    } catch (error) {
      console.warn('[DogMarker] Failed to load image, using avatar:', error);
      drawFallbackAvatar(ctx, totalSize, size, dogName);
    }
  } else {
    drawFallbackAvatar(ctx, totalSize, size, dogName);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Draw a fallback avatar with initials
 */
function drawFallbackAvatar(
  ctx: CanvasRenderingContext2D,
  totalSize: number,
  size: number,
  dogName: string
): void {
  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, totalSize, totalSize);
  gradient.addColorStop(0, '#FFB6C1');
  gradient.addColorStop(1, '#FF69B4');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(totalSize / 2, totalSize / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw initials
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const initials = dogName.substring(0, 1).toUpperCase();
  ctx.fillText(initials, totalSize / 2, totalSize / 2);
}

/**
 * Get default marker icon (fallback)
 */
export function getDefaultMarkerIcon(): string {
  // SVG marker icon
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <circle cx="20" cy="20" r="18" fill="#FFB6C1" stroke="#FF69B4" stroke-width="2"/>
      <text x="20" y="24" font-size="20" font-weight="bold" text-anchor="middle" fill="#FFFFFF">🐕</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Create a marker icon with label
 */
export function createMarkerWithLabel(
  photoUrl?: string,
  label?: string
): google.maps.Icon {
  return {
    url: photoUrl || getDefaultMarkerIcon(),
    scaledSize: new google.maps.Size(50, 50),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(25, 25),
  };
}
