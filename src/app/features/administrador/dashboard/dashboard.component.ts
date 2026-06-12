import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
export class DashboardComponent implements OnInit {
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

  constructor(private readonly dashboardApi: DashboardApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';

    const f: DashboardFiltros = { ...this.filtros };
    if (this.desde) f.desde = this.desde;
    if (this.hasta) f.hasta = this.hasta;

    this.dashboardApi.getDashboard(f).subscribe({
      next: (data) => {
        this.resumen = data.resumen;
        this.porEstado = data.por_estado || [];
        this.serieTemporal = data.serie_temporal || [];
        this.tiposIncidentes = data.tipos_incidentes || [];
        this.zonasMasIncidentes = data.zonas_mas_incidentes || [];
        this.talleresEficientes = data.talleres_eficientes || [];
        this.mapaIncidentes = data.mapa_incidentes || [];
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || 'Error al cargar el dashboard.';
        this.loading = false;
      },
    });
  }

  setTab(tab: 'resumen' | 'estados' | 'timeline' | 'talleres' | 'mapa'): void {
    this.activeTab = tab;
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
}
