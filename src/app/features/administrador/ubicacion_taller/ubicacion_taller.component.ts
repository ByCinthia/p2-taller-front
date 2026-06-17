import { Component, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpresaApiService, EmpresaDto } from '../../services/empresa.service';
import { AuthService } from '../../services/auth/auth.service';

import * as L from 'leaflet';

@Component({
  selector: 'app-ubicacion-taller',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ubicacion_taller.component.html',
  styleUrls: ['./ubicacion_taller.component.css'],
})
export class UbicacionTallerComponent implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private marker?: L.Marker;
  latitud: number | null = null;
  longitud: number | null = null;
  message = '';

  constructor(
    private readonly empresa: EmpresaApiService, 
    private readonly ngZone: NgZone,
    public readonly auth: AuthService
  ) {}

  get hasSelection() {
    return this.latitud != null && this.longitud != null;
  }

  get latitudDisplay() {
    return this.latitud?.toFixed(6) ?? '—';
  }
  get longitudDisplay() {
    return this.longitud?.toFixed(6) ?? '—';
  }

  ngAfterViewInit(): void {
    this.setupLeafletIcons();
    this.initMap();
    this.cargarUbicacion();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private setupLeafletIcons() {
    // Use local assets for Leaflet markers (assets/leaflet/*)
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });
  }

  private initMap() {
    // marker icons configured in setupLeafletIcons()

    this.map = L.map('map', { center: [0, 0], zoom: 2 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      // solo admins pueden editar
      if (!this.auth.isAdmin || !this.auth.hasAdminPermission) return;
      
      // run inside Angular zone to update bindings
      this.ngZone.run(() => {
        const { lat, lng } = e.latlng;
        this.setMarker(lat, lng);
      });
    });
  }

  private setMarker(lat: number, lng: number) {
    this.latitud = lat;
    this.longitud = lng;
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }
    this.map.setView([lat, lng], 15);
  }

  usarMiUbicacion() {
    if (!navigator.geolocation) {
      this.message = 'Geolocalización no disponible en este navegador.';
      return;
    }
    this.message = 'Obteniendo ubicación...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.ngZone.run(() => {
          this.message = '';
          this.setMarker(pos.coords.latitude, pos.coords.longitude);
        });
      },
      (err: any) => {
        this.ngZone.run(() => {
          this.message = 'No se pudo obtener la ubicación: ' + err.message;
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  private cargarUbicacion() {
    // Schedule the 'cargando' message after change detection to avoid
    // ExpressionChangedAfterItHasBeenCheckedError.
    setTimeout(() => (this.message = 'Cargando ubicación del taller...'));
    this.empresa.getMyEmpresa().subscribe({
      next: (e: EmpresaDto) => {
        this.message = '';
        if (e.latitud != null && e.longitud != null) {
          this.latitud = Number(e.latitud);
          this.longitud = Number(e.longitud);
          this.setMarker(this.latitud, this.longitud);
        } else {
          // center on a reasonable default (country / world)
          if (this.map) this.map.setView([ -17.783737, -63.182103 ], 6);
        }
      },
      error: (err: any) => {
        this.message = 'Error cargando empresa: ' + (err?.error?.detail ?? err.message ?? '');
      },
    });
  }

  guardarUbicacion() {
    if (this.latitud == null || this.longitud == null) return;
    this.message = 'Guardando ubicación...';
    this.empresa.updateUbicacion(this.latitud, this.longitud).subscribe({
      next: (res) => {
        this.message = 'Ubicación guardada correctamente.';
      },
      error: (err: any) => {
        this.message = 'Error guardando ubicación: ' + (err?.error?.detail ?? err.message ?? '');
      },
    });
  }
}
