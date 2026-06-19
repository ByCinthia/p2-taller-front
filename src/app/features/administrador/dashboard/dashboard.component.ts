import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import * as L from 'leaflet';
import {
  DashboardApiService,
  DashboardCompleto,
  DashboardFiltros,
  ResumenDashboard,
  IncidentePorEstado,
  PuntoSerieTemporal,
  MapaIncidenteOut,
  RendimientoTallerOut,
} from '../../../core/servicios/dashboard.api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Datos del dashboard completo
  resumen: ResumenDashboard | null = null;
  porEstado: IncidentePorEstado[] = [];
  serieTemporal: PuntoSerieTemporal[] = [];
  tiposIncidentes: { tipo: string; cantidad: number }[] = [];
  zonasMasIncidentes: { latitud: number; longitud: number; cantidad: number; tipos: string[] }[] = [];
  talleresEficientes: RendimientoTallerOut[] = [];
  mapaIncidentes: MapaIncidenteOut[] = [];

  // Filtros
  filtros: DashboardFiltros = { intervalo: 'day' };
  desde = '';
  hasta = '';

  loading = false;
  errorMsg = '';
  activeTab: 'resumen' | 'estados' | 'timeline' | 'talleres' | 'mapa' = 'resumen';
  private loadCount = 0;

  private map?: L.Map;
  private markersGroup?: L.FeatureGroup;

  constructor(private readonly dashboardApi: DashboardApiService) {}

  ngOnInit(): void {
    console.log('[Dashboard] ngOnInit ejecutado');
    this.load();
  }

  load(): void {
    if (this.loading) {
      console.log('[Dashboard] load() ignorado (ya en curso)');
      return;
    }

    this.loadCount++;
    console.log('[Dashboard] load() iniciado, count=', this.loadCount);

    this.loading = true;
    this.errorMsg = '';

    const f: DashboardFiltros = { ...this.filtros };
    if (this.desde) f.desde = this.desde;
    if (this.hasta) f.hasta = this.hasta;

    console.log('[Dashboard] filtros enviados:', f);

    this.dashboardApi.getDashboard(f)
      .pipe(
        finalize(() => {
          this.loading = false;
          console.log('[Dashboard] loading=false (finalize)');
        })
      )
      .subscribe({
        next: (data) => {
          console.log('[Dashboard] respuesta recibida:', data);

          this.resumen = data.resumen;
          this.porEstado = data.por_estado || [];
          this.serieTemporal = data.serie_temporal || [];
          this.tiposIncidentes = data.tipos_incidentes || [];
          this.zonasMasIncidentes = data.zonas_mas_incidentes || [];
          this.talleresEficientes = data.talleres_eficientes || [];
          this.mapaIncidentes = data.mapa_incidentes || [];

          if (this.activeTab === 'mapa') {
            setTimeout(() => this.initMap(), 50);
          }
        },
        error: (err) => {
          console.error('[Dashboard] error:', err);
          this.errorMsg = err?.error?.detail || err?.message || 'Error al cargar el dashboard.';
        },
      });
  }

  setTab(tab: 'resumen' | 'estados' | 'timeline' | 'talleres' | 'mapa'): void {
    if (this.activeTab === 'mapa' && tab !== 'mapa') {
      this.destroyMap();
    }
    this.activeTab = tab;
    if (tab === 'mapa') {
      setTimeout(() => {
        this.initMap();
      }, 50);
    }
  }

  initMap(): void {
    if (!this.mapaIncidentes || this.mapaIncidentes.length === 0) return;

    const container = document.getElementById('dashboard-map');
    if (!container) {
      setTimeout(() => this.initMap(), 50);
      return;
    }

    if (this.map) {
      this.map.invalidateSize();
      this.updateMapMarkers();
      return;
    }

    this.setupLeafletIcons();

    const defaultCenter: L.LatLngExpression = [-17.783737, -63.182103];
    try {
      this.map = L.map(container, { center: defaultCenter, zoom: 12 });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      this.markersGroup = L.featureGroup().addTo(this.map);
      this.updateMapMarkers();

      // Forzar recálculo del tamaño después de renderizar para asegurar la visibilidad correcta del mapa
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);
    } catch (e) {
      console.error('Error al inicializar el mapa Leaflet:', e);
    }
  }

  private setupLeafletIcons(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });
  }

  private updateMapMarkers(): void {
    if (!this.map || !this.markersGroup || !this.mapaIncidentes) return;

    this.markersGroup.clearLayers();

    let count = 0;
    this.mapaIncidentes.forEach((inc) => {
      if (inc.latitud != null && inc.longitud != null) {
        count++;
        const color = this.getEstadoColor(inc.estado);
        const marker = L.circleMarker([Number(inc.latitud), Number(inc.longitud)], {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.95,
        }).bindPopup(`
            <div style="font-family: Segoe UI, sans-serif; font-size: 13px;">
              <strong>Tipo:</strong> ${inc.tipo || 'Sin tipo'}<br/>
              <strong>Estado:</strong> <span class="badge" style="background-color: ${color}; color: white; padding: 0.15rem 0.5rem; border-radius: 9999px; text-transform: capitalize;">${inc.estado}</span><br/>
              <strong>Cliente:</strong> ${inc.cliente_nombre || '—'}<br/>
              <strong>Taller:</strong> ${inc.taller_nombre || '—'}<br/>
              <strong>Fecha:</strong> ${new Date(inc.creado_en).toLocaleString()}<br/>
            </div>
          `);
        this.markersGroup?.addLayer(marker);
      }
    });

    if (count > 0) {
      this.map.fitBounds(this.markersGroup.getBounds(), { padding: [30, 30] });
    }
  }

  get maxSerieCantidad(): number {
    return Math.max(...this.serieTemporal.map((p) => p.cantidad), 1);
  }

  get maxTipoCantidad(): number {
    return Math.max(...this.tiposIncidentes.map((t) => t.cantidad), 1);
  }

  getEstadoColor(estado: string): string {
    const colors: Record<string, string> = {
      pendiente: '#f59e0b',
      aceptada: '#3b82f6',
      asignada: '#8b5cf6',
      en_proceso: '#6366f1',
      atendida: '#10b981',
      completada: '#059669',
      cancelada: '#ef4444',
    };
    return colors[estado] || '#6b7280';
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.markersGroup = undefined;
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }
}
