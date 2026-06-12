import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardMetrics {
  tiempo_promedio_asignacion: { minutos: number | null; total_registros: number };
  tiempo_promedio_llegada: { minutos: number | null; total_registros: number };
  tipos_incidentes: { tipo: string; cantidad: number }[];
  talleres_eficientes: {
    empresa_id: string;
    nombre: string;
    total_incidentes: number;
    tiempo_promedio_asignacion_min: number | null;
    tiempo_promedio_resolucion_min: number | null;
    estrellas_promedio: number;
    puntuacion_eficiencia: number;
  }[];
  zonas_mas_incidentes: {
    latitud_redondeada: number;
    longitud_redondeada: number;
    cantidad: number;
    tipos: string[];
  }[];
  casos_cancelados: {
    total_cancelados: number;
    cancelados_por_taller: number;
    cancelados_por_cliente: number;
    porcentaje_cancelacion: number;
  };
  solicitudes_en_tiempo: {
    total_asignadas: number;
    atendidas_en_tiempo: number;
    porcentaje: number;
  };
}

export interface TallerEficienteOut {
  empresa_id: string;
  nombre: string;
  total_incidentes: number;
  tiempo_promedio_asignacion_min: number | null;
  tiempo_promedio_resolucion_min: number | null;
  estrellas_promedio: number;
  puntuacion_eficiencia: number;
}

export interface ZonaIncidenteOut {
  latitud_redondeada: number;
  longitud_redondeada: number;
  cantidad: number;
  tipos: string[];
}

@Injectable({ providedIn: 'root' })
export class MetricasApiService {
  private readonly base = `${environment.apiBaseUrl}/api/metricas`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(empresaId?: string): Observable<DashboardMetrics> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa_id', empresaId);
    return this.http.get<DashboardMetrics>(`${this.base}/dashboard`, { params });
  }

  getTiempoAsignacion(empresaId?: string): Observable<{ minutos: number | null; total_registros: number }> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa_id', empresaId);
    return this.http.get<{ minutos: number | null; total_registros: number }>(`${this.base}/tiempo-asignacion`, { params });
  }

  getTiempoLlegada(empresaId?: string): Observable<{ minutos: number | null; total_registros: number }> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa_id', empresaId);
    return this.http.get<{ minutos: number | null; total_registros: number }>(`${this.base}/tiempo-llegada`, { params });
  }

  getTiposIncidentes(empresaId?: string): Observable<{ tipo: string; cantidad: number }[]> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa_id', empresaId);
    return this.http.get<{ tipo: string; cantidad: number }[]>(`${this.base}/tipos-incidentes`, { params });
  }

  getTalleresEficientes(limit = 10): Observable<TallerEficienteOut[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<TallerEficienteOut[]>(`${this.base}/talleres-eficientes`, { params });
  }

  getZonasIncidentes(limit = 10): Observable<ZonaIncidenteOut[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ZonaIncidenteOut[]>(`${this.base}/zonas-incidentes`, { params });
  }

  getCancelados(empresaId?: string): Observable<{
    total_cancelados: number;
    cancelados_por_taller: number;
    cancelados_por_cliente: number;
    porcentaje_cancelacion: number;
  }> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa_id', empresaId);
    return this.http.get<any>(`${this.base}/cancelados`, { params });
  }

  getSolicitudesEnTiempo(empresaId?: string): Observable<{
    total_asignadas: number;
    atendidas_en_tiempo: number;
    porcentaje: number;
  }> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa_id', empresaId);
    return this.http.get<any>(`${this.base}/solicitudes-en-tiempo`, { params });
  }
}
