import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// --- Tipos ---

export interface ReporteGenerado {
  reporte: string;
  metadata: {
    modelo: string;
    generado_en: string;
    empresa_id: string | null;
    prompt_original: string;
    transcripcion?: string;
  };
  datos_contexto: Record<string, unknown>;
}

export interface EstadoIA {
  ollama_disponible: boolean;
  url: string;
  modelo_configurado: string;
  modelos_instalados: string[];
}

// --- Servicio ---

@Injectable({ providedIn: 'root' })
export class ReportesApiService {
  private readonly base = `${environment.apiBaseUrl}/api/reportes`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Genera reporte dinámico usando IA local (Ollama).
   */
  generarReporte(
    prompt: string,
    formato: 'texto' | 'pdf' = 'texto',
    empresa_id?: string
  ): Observable<ReporteGenerado | Blob> {
    const body: Record<string, unknown> = { prompt, formato };
    if (empresa_id) body['empresa_id'] = empresa_id;

    if (formato === 'pdf') {
      return this.http.post(`${this.base}/generar`, body, {
        responseType: 'blob',
      });
    }

    return this.http.post<ReporteGenerado>(`${this.base}/generar`, body);
  }

  /**
   * Genera reporte a partir de audio.
   */
  generarReporteAudio(
    archivo: File,
    formato: 'texto' | 'pdf' = 'texto',
    empresa_id?: string
  ): Observable<ReporteGenerado | Blob> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('formato', formato);
    if (empresa_id) formData.append('empresa_id', empresa_id);

    if (formato === 'pdf') {
      return this.http.post(`${this.base}/generar-audio`, formData, {
        responseType: 'blob',
      });
    }

    return this.http.post<ReporteGenerado>(`${this.base}/generar-audio`, formData);
  }

  /**
   * Verifica si Ollama está disponible y lista los modelos instalados.
   */
  getEstadoIA(): Observable<EstadoIA> {
    return this.http.get<EstadoIA>(`${this.base}/estado-ia`);
  }
}
