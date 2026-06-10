import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapTrackingService, TrackingData } from '../../servicios/map-tracking.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-tracking.component.html',
  styleUrls: ['./map-tracking.component.css'],
})
export class MapTrackingComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() incidenteId!: string;
  @Input() incidenteLat: number | null = null;
  @Input() incidenteLng: number | null = null;

  @ViewChild('mapContainer') mapContainerElement!: ElementRef<HTMLDivElement>;

  private L: any;
  private map: any;
  private incidentMarker: any;
  private technicianMarker: any;
  private trackingSubscription: Subscription | null = null;
  private connectionSubscription: Subscription | null = null;

  isConnected = false;
  technicianLat: number | null = null;
  technicianLng: number | null = null;
  lastUpdated: Date | null = null;

  constructor(private mapTrackingService: MapTrackingService) {}

  ngOnInit(): void {
    // Suscribirse al estado de la conexión WebSocket
    this.connectionSubscription = this.mapTrackingService.connectionStatus$.subscribe({
      next: (status) => {
        this.isConnected = status;
      },
    });

    // Suscribirse a las actualizaciones de ubicación del técnico
    this.trackingSubscription = this.mapTrackingService.trackingUpdates$.subscribe({
      next: (data: TrackingData) => {
        this.technicianLat = data.latitud;
        this.technicianLng = data.longitud;
        this.lastUpdated = new Date();
        this.updateMapMarkers();
      },
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initLeaflet();
    this.initMap();
    if (this.incidenteId) {
      this.mapTrackingService.connect(this.incidenteId);
    }
  }

  ngOnDestroy(): void {
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
    }
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
    this.mapTrackingService.disconnect();
    if (this.map) {
      this.map.remove();
    }
  }

  private async initLeaflet(): Promise<void> {
    if (this.L) return;
    const leaflet = await import('leaflet');
    this.L = leaflet;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }

  private initMap(): void {
    if (!this.mapContainerElement || !this.L) return;

    // Centrar por defecto en Santa Cruz si no hay coordenadas del incidente
    const centerLat = this.incidenteLat ?? -17.7833;
    const centerLng = this.incidenteLng ?? -63.1821;

    this.map = this.L.map(this.mapContainerElement.nativeElement).setView([centerLat, centerLng], 14);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    // Dibujar el marcador del incidente si existen coordenadas
    if (this.incidenteLat != null && this.incidenteLng != null) {
      const redIcon = new this.L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      this.incidentMarker = this.L.marker([this.incidenteLat, this.incidenteLng], { icon: redIcon })
        .addTo(this.map)
        .bindPopup('Ubicación del Incidente')
        .openPopup();
    }
  }

  private updateMapMarkers(): void {
    if (!this.map || !this.L) return;

    if (this.technicianLat != null && this.technicianLng != null) {
      const techLatLng: [number, number] = [this.technicianLat, this.technicianLng];

      const techIcon = new this.L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      if (!this.technicianMarker) {
        this.technicianMarker = this.L.marker(techLatLng, { icon: techIcon })
          .addTo(this.map)
          .bindPopup('Técnico en Camino')
          .openPopup();
      } else {
        this.technicianMarker.setLatLng(techLatLng);
      }

      // Reajustar mapa para visualizar ambos puntos
      const bounds: any[] = [];
      if (this.incidenteLat != null && this.incidenteLng != null) {
        bounds.push([this.incidenteLat, this.incidenteLng]);
      }
      bounds.push(techLatLng);

      if (bounds.length > 1) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        this.map.setView(techLatLng, 15);
      }
    }
  }
}
