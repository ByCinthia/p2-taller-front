import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// --- Tipos del Dashboard ---

export interface ResumenDashboard {
  total_incidentes: number;
  incidentes_pendientes: number;
  incidentes_aceptados: number;
  incidentes_asignados: number;
  incidentes_en_proceso: number;
  incidentes_atendidos: number;
  incidentes_completados: number;
  incidentes_cancelados: number;
  total_talleres: number;
  total_clientes: number;
  total_tecnicos: number;
  promedio_estrellas_talleres: number;
}

export interface IncidentePorEstado {
  estado: string;
  cantidad: number;
  porcentaje: number;
}

export interface PuntoSerieTemporal {
  fecha: string;
  cantidad: number;
}

export interface MapaIncidenteOut {
  incidente_id: string;
  tipo: string | null;
  estado: string;
  latitud: number;
  longitud: number;
  creado_en: string;
  cliente_nombre: string | null;
  taller_nombre: string | null;
}

export interface RendimientoTallerOut {
  empresa_id: string;
  nombre: string;
  total_solicitudes: number;
  tiempo_promedio_asignacion_min: number | null;
  tiempo_promedio_resolucion_min: number | null;
  estrellas_promedio: number;
  puntuacion_eficiencia: number;
}

export interface DashboardCompleto {
  resumen: ResumenDashboard;
  por_estado: IncidentePorEstado[];
  serie_temporal: PuntoSerieTemporal[];
  tipos_incidentes: { tipo: string; cantidad: number }[];
  zonas_mas_incidentes: { latitud: number; longitud: number; cantidad: number; tipos: string[] }[];
  talleres_eficientes: RendimientoTallerOut[];
  mapa_incidentes: MapaIncidenteOut[];
}

export interface DashboardFiltros {
  empresa_id?: string;
  desde?: string;
  hasta?: string;
  intervalo?: 'day' | 'week' | 'month';
  limit_talleres?: number;
  limit_zonas?: number;
  limit_mapa?: number;
}

// --- Servicio ---

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly base = `${environment.apiBaseUrl}/api/dashboard`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Dashboard completo: resumen + series + mapa + talleres + zonas.
   * Carga todo en una sola llamada.
   */
  getDashboard(filtros?: DashboardFiltros): Observable<DashboardCompleto> {
    return this.http.get<DashboardCompleto>(this.base, { params: this.buildParams(filtros) });
  }

  /**
   * Tarjetas KPI: totales por estado, talleres, clientes, técnicos.
   */
  getResumen(filtros?: DashboardFiltros): Observable<ResumenDashboard> {
    return this.http.get<ResumenDashboard>(`${this.base}/resumen`, { params: this.buildParams(filtros) });
  }

  /**
   * Desglose por estado con porcentajes (gráfico de pastel).
   */
  getPorEstado(filtros?: DashboardFiltros): Observable<IncidentePorEstado[]> {
    return this.http.get<IncidentePorEstado[]>(`${this.base}/por-estado`, { params: this.buildParams(filtros) });
  }

  /**
   * Serie temporal agrupada por día/semana/mes (gráfico de línea/barras).
   */
  getPorFecha(filtros?: DashboardFiltros): Observable<PuntoSerieTemporal[]> {
    return this.http.get<PuntoSerieTemporal[]>(`${this.base}/por-fecha`, { params: this.buildParams(filtros) });
  }

  /**
   * Incidentes con coordenadas para mapa (Leaflet/Google Maps).
   */
  getMapa(filtros?: DashboardFiltros): Observable<MapaIncidenteOut[]> {
    return this.http.get<MapaIncidenteOut[]>(`${this.base}/mapa`, { params: this.buildParams(filtros) });
  }

  /**
   * Ranking de talleres con métricas de rendimiento.
   */
  getTalleres(filtros?: DashboardFiltros): Observable<RendimientoTallerOut[]> {
    return this.http.get<RendimientoTallerOut[]>(`${this.base}/talleres`, { params: this.buildParams(filtros) });
  }

  private buildParams(filtros?: DashboardFiltros): HttpParams {
    let params = new HttpParams();
    if (!filtros) return params;
    if (filtros.empresa_id) params = params.set('empresa_id', filtros.empresa_id);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.intervalo) params = params.set('intervalo', filtros.intervalo);
    if (filtros.limit_talleres) params = params.set('limit_talleres', filtros.limit_talleres);
    if (filtros.limit_zonas) params = params.set('limit_zonas', filtros.limit_zonas);
    if (filtros.limit_mapa) params = params.set('limit_mapa', filtros.limit_mapa);
    return params;
  }
}
