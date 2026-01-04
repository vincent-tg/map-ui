import mapboxgl from 'mapbox-gl';

export const MAPBOX_CONFIG = {
  defaultStyle: 'mapbox://styles/mapbox/streets-v12',
  defaultCenter: [0, 0] as [number, number],
  defaultZoom: 2,
  minZoom: 1,
  maxZoom: 20,
};

export const getMapboxToken = (): string => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || token === 'your_mapbox_token_here') {
    console.warn(
      'Mapbox token not configured. Please set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local'
    );
    return '';
  }
  return token;
};

export const initializeMapbox = (): void => {
  const token = getMapboxToken();
  if (token) {
    mapboxgl.accessToken = token;
  }
};

export const getMapboxStyle = (): string => {
  return MAPBOX_CONFIG.defaultStyle;
};

