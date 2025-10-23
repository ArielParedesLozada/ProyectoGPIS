declare module 'leaflet' {
  export interface LatLng {
    lat: number;
    lng: number;
  }

  export type LatLngExpression = [number, number] | { lat: number; lng: number };

  export interface MapOptions {
    center: LatLngExpression;
    zoom: number;
    className?: string;
    zoomControl?: boolean;
    dragging?: boolean;
    touchZoom?: boolean;
    doubleClickZoom?: boolean;
    scrollWheelZoom?: boolean;
  }

  export interface IconOptions {
    iconRetinaUrl?: string;
    iconUrl?: string;
    shadowUrl?: string;
  }

  export class Icon {
    static Default: {
      prototype: Icon;
      mergeOptions(options: IconOptions): void;
    };
    constructor(options: IconOptions);
  }

  export class Map {
    setView(center: LatLngExpression, zoom: number): this;
  }

  export class TileLayer {
    constructor(url: string, options?: any);
  }

  export class Marker {
    constructor(latLng: LatLngExpression, options?: any);
  }

  export interface LeafletMouseEvent {
    latlng: LatLng;
  }
}

declare module 'react-leaflet' {
  import { ComponentType } from 'react';
  import { LatLngExpression, MapOptions, LeafletMouseEvent } from 'leaflet';

  export interface MapContainerProps extends MapOptions {
    children?: React.ReactNode;
    ref?: React.Ref<any>;
  }

  export interface TileLayerProps {
    attribution?: string;
    url: string;
  }

  export interface MarkerProps {
    position: LatLngExpression;
  }

  export interface MapEventsProps {
    click?: (e: LeafletMouseEvent) => void;
  }

  export const MapContainer: ComponentType<MapContainerProps>;
  export const TileLayer: ComponentType<TileLayerProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const useMapEvents: (events: MapEventsProps) => void;
}
