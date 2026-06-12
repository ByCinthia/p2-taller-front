import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IncidenteDto {
  id: string;
  cliente_id?: string;
  vehiculo_id?: string;
  tipo?: string;
  descripcion?: string;
  estado: string;
  accepted_empresa_id?: string | null;
  prioridad?: number;
  latitud?: number;
  longitud?: number;
  creado_en: string;
  evidencias?: { id: string; tipo: string; url_archivo: string; texto?: string }[];
}

export interface IncidenteCreateRequest {
  vehiculo_id?: string;
  tipo?: string;
  descripcion?: string;
  prioridad?: number;
  latitud?: number;
  longitud?: number;
}

export interface AsignarTecnicoRequest {
  empleado_id: string;
  servicio_id?: string;
}

export interface IncidenteEstadoPatchRequest {
  estado: string;
}

export interface IncidenteEstadoUbicacionPatchRequest {
  estado: string;
  latitud?: number;
  longitud?: number;
}

export interface TecnicoUbicacionRequest {
  latitud: number;
  longitud: number;
  disponible?: boolean;
}

export interface TecnicoCercanoDto {
  empleado_id: string;
  nombre_completo: string;
  latitud: number;
  longitud: number;
  distancia_km: number;
  disponible: boolean;
}

export interface IncidenteTrackingDto {
  incidente_id: string;
  estado: string;
  latitud_incidente?: number;
  longitud_incidente?: number;
  asignacion_id?: string;
  empleado_id?: string;
  tecnico_nombre?: string;
  tecnico_latitud?: number;
  tecnico_longitud?: number;
  tecnico_disponible?: boolean;
  tecnico_ubicacion_actualizada_en?: string;
}

export interface DiagnosticoCreate {
  clasificacion?: number | null;
  resumen?: string | null;
  prioridad?: number | null;
}

export interface EvidenciaUploadResponse {
  id: string;
  url_archivo: string;
  tipo: string;
}

@Injectable({ providedIn: 'root' })
export class IncidenteApiService {
  // include /api prefix so endpoints match backend (e.g. /api/incidentes)
  private base = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) {}

  list(): Observable<IncidenteDto[]> {
    return this.http.get<IncidenteDto[]>(`${this.base}/incidentes/`);
  }

  get(id: string) {
    return this.http.get<IncidenteDto>(`${this.base}/incidentes/${id}/`);
  }

  create(payload: IncidenteCreateRequest) {
    return this.http.post<IncidenteDto>(`${this.base}/incidentes/`, payload);
  }

  update(id: string, patch: Partial<IncidenteDto>) {
    return this.http.patch<IncidenteDto>(`${this.base}/incidentes/${id}/`, patch);
  }

  updateEstado(id: string, payload: IncidenteEstadoPatchRequest) {
    return this.http.patch<{ id: string; estado: string }>(`${this.base}/incidentes/${id}/estado`, payload);
  }

  addDiagnostico(id: string, payload: DiagnosticoCreate) {
    return this.http.post(`${this.base}/incidentes/${id}/diagnosticos`, payload);
  }

    updateEstadoConUbicacion(id: string, payload: IncidenteEstadoUbicacionPatchRequest) {
      return this.http.patch<{ id: string; estado: string }>(`${this.base}/incidentes/${id}/estado`, payload);
    }

  addEvidencia(id: string, tipo: string, archivo: string) {
    // send as url_archivo to match backend field naming
    return this.http.post(`${this.base}/incidentes/${id}/evidencias`, { tipo, url_archivo: archivo });
  }

  uploadEvidenciaArchivo(id: string, file: File, tipo?: string, texto?: string) {
    const form = new FormData();
    form.append('archivo', file, file.name);
    if (tipo) form.append('tipo', tipo);
    if (texto) form.append('texto', texto);
    return this.http.post<EvidenciaUploadResponse>(`${this.base}/incidentes/${id}/evidencias/upload`, form);
  }

  assignTecnico(id: string, payload: AsignarTecnicoRequest) {
    return this.http.post<IncidenteDto>(`${this.base}/incidentes/${id}/asignacion`, payload);
  }

  acceptIncident(id: string) {
    return this.http.post<IncidenteDto>(`${this.base}/incidentes/${id}/aceptar-solicitud`, {});
  }

  cancelAcceptance(id: string) {
    return this.http.post<IncidenteDto>(`${this.base}/incidentes/${id}/cancelar-aceptacion`, {});
  }

  updateMiUbicacion(payload: TecnicoUbicacionRequest) {
    return this.http.patch(`${this.base}/incidentes/tecnicos/mi-ubicacion`, payload);
  }

  updateUbicacionTecnicoIncidente(id: string, payload: TecnicoUbicacionRequest) {
    return this.http.patch(`${this.base}/incidentes/${id}/tecnico/ubicacion`, payload);
  }

  getTracking(id: string) {
    return this.http.get<IncidenteTrackingDto>(`${this.base}/incidentes/${id}/tracking`);
  }

  //listTecnicosCercanos(latitud: number, longitud: number, radioKm = 5) {
    //return this.http.get<TecnicoCercanoDto[]>(
      //`${this.base}/incidentes/tecnicos/cercanos`,
      //{
        //params: {
         // latitud,
       //   longitud,
          //radio_km: radioKm,
       // },
     // },
   // );
 // }

  listTecnicosDisponibles(): Observable<TecnicoCercanoDto[]> {
  return this.http.get<TecnicoCercanoDto[]>(`${this.base}/incidentes/tecnicos/disponibles`);
}

  getDiagnosticos(incidenteId: string) {
    return this.http.get<any[]>(`${this.base}/incidentes/${incidenteId}/diagnosticos`);
  }

  updateDiagnostico(diagnosticoId: string, payload: DiagnosticoCreate) {
    return this.http.put(`${this.base}/incidentes/diagnosticos/${diagnosticoId}`, payload);
  }

  ignoreIncident(incidenteId: string, empresaId: string) {
    return this.http.post(`${this.base}/incidentes/${incidenteId}/ignorar`, { empresa_id: empresaId });
  }

  autoAsignar(incidenteId: string, radioKm = 5.0) {
    return this.http.post<any>(`${this.base}/incidentes/${incidenteId}/auto-asignar`, {}, {
      params: { radio_km: radioKm },
    });
  }

  listTalleresCercanos(latitud: number, longitud: number, radioKm = 5.0, servicio?: string) {
    const params: any = { latitud, longitud, radio_km: radioKm };
    if (servicio) params.servicio = servicio;
    return this.http.get<any[]>(`${this.base}/incidentes/talleres/cercanos`, { params });
  }

  getTrackingWebSocketUrl(id: string): string {
    const normalized = this.base.replace(/\/$/, '');
    const wsBase = normalized.startsWith('https://')
      ? normalized.replace('https://', 'wss://')
      : normalized.replace('http://', 'ws://');
    return `${wsBase}/incidentes/${id}/ws/tracking`;
  }
}
