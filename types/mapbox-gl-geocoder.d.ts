declare module '@mapbox/mapbox-gl-geocoder' {
  import mapboxgl from 'mapbox-gl';

  export default class MapboxGeocoder {
    constructor(options: {
      accessToken: string;
      mapboxgl: typeof mapboxgl;
      placeholder?: string;
      marker?: boolean;
      types?: string;
      countries?: string | undefined;
    });

    on(event: string, callback: (e: any) => void): void;
    off(event: string, callback?: (e: any) => void): void;
    query(query: string): void;
    clear(): void;
    onAdd(map: mapboxgl.Map): HTMLElement;
  }
}

