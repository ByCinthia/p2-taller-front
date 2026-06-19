import { Component, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpresaApiService, EmpresaDto } from '../../services/empresa.service';
import { AuthService } from '../../services/auth/auth.service';
import { IncidenteApiService } from '../../../core/servicios/incidentes.api.service';
import { EmpleadoApiService } from '../../../core/servicios/empleados.api.service';
import { FormsModule } from '@angular/forms';

import * as L from 'leaflet';

@Component({
  selector: 'app-ubicacion-taller',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ubicacion_taller.component.html',
  styleUrls: ['./ubicacion_taller.component.css'],
})
export class UbicacionTallerComponent implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private marker?: L.Marker;
  latitud: number | null = null;
  longitud: number | null = null;
  disponible: boolean = true;
  message = '';

  constructor(
    private readonly empresa: EmpresaApiService, 
    private readonly incidentesApi: IncidenteApiService,
    private readonly empleadoApi: EmpleadoApiService,
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
      // solo admins pueden editar taller, pero empleados editan la suya
      if (!this.auth.isAdmin && !this.auth.isEmpleadoTecnico) return;
      if (this.auth.isAdmin && !this.auth.hasAdminPermission) return;
      
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
          if (this.auth.isEmpleadoTecnico) {
            this.message = 'No se pudo obtener tu ubicación. Activa permisos de ubicación o selecciona manualmente en el mapa. Error: ' + err.message;
          } else {
            this.message = 'No se pudo obtener la ubicación: ' + err.message;
          }
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  private cargarUbicacion() {
    setTimeout(() => (this.message = 'Cargando ubicación...'));
    
    if (this.auth.isEmpleadoTecnico) {
      this.empleadoApi.getMe().subscribe({
        next: (emp) => {
          this.message = '';
          if (emp.latitud_actual != null && emp.longitud_actual != null) {
            this.latitud = Number(emp.latitud_actual);
            this.longitud = Number(emp.longitud_actual);
            this.disponible = emp.disponible ?? true;
            this.setMarker(this.latitud, this.longitud);
          } else {
            if (this.map) this.map.setView([ -17.783737, -63.182103 ], 6);
          }
        },
        error: (err: any) => {
          this.message = 'Error cargando tu ubicación: ' + (err?.error?.detail ?? err.message ?? '');
        }
      });
    } else {
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
  }

  guardarUbicacion() {
    console.log('Guardar ubicación clickeado');
    console.log('latitud=', this.latitud);
    console.log('longitud=', this.longitud);

    if (this.latitud == null || this.longitud == null) {
      this.message = 'Primero obtén o selecciona una ubicación.';
      return;
    }
    this.message = 'Guardando ubicación...';

    if (this.auth.isEmpleadoTecnico) {
      this.incidentesApi.updateMiUbicacion({
        latitud: this.latitud,
        longitud: this.longitud,
        disponible: this.disponible
      }).subscribe({
        next: (res) => {
          this.message = 'Ubicación actualizada correctamente.';
          this.empleadoApi.invalidarCacheAsignaciones();
          if (this.auth.currentUser) {
            (this.auth.currentUser as any).latitud_actual = this.latitud!;
            (this.auth.currentUser as any).longitud_actual = this.longitud!;
          }
          // Verify by fetching from GET /api/empleados/me/
          this.empleadoApi.getMe().subscribe({
            next: (empleadoData) => {
              console.log('Location verified from server:', empleadoData.latitud_actual, empleadoData.longitud_actual);
            }
          });
        },
        error: (err: any) => {
          this.message = 'No se pudo guardar la ubicación. ' + (err?.error?.detail ?? err.message ?? '');
        },
      });
    } else {
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
}
