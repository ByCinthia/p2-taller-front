import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PagoDto {
  id: string;
  asignacion_id: string;
  monto_total: string;
  metodo_pago: string;
  estado: string;
  creado_en: string;
  confirmado_en?: string | null;
}

export interface PagoCreateRequest {
  monto_total?: string;
  metodo_pago: 'efectivo' | 'qr_simulado' | 'tarjeta_simulada';
}

@Injectable({ providedIn: 'root' })
export class PagosApiService {
  private readonly base = `${environment.apiBaseUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  createPago(asignacionId: string, payload: PagoCreateRequest): Observable<PagoDto> {
    return this.http.post<PagoDto>(`${this.base}/asignaciones/${asignacionId}/pago`, payload);
  }

  list(): Observable<PagoDto[]> {
    return this.http.get<PagoDto[]>(`${this.base}/pagos/`);
  }

  get(pagoId: string): Observable<PagoDto> {
    return this.http.get<PagoDto>(`${this.base}/pagos/${pagoId}`);
  }

  confirmar(pagoId: string): Observable<PagoDto> {
    return this.http.patch<PagoDto>(`${this.base}/pagos/${pagoId}/confirmar`, {});
  }

  rechazar(pagoId: string): Observable<PagoDto> {
    return this.http.patch<PagoDto>(`${this.base}/pagos/${pagoId}/rechazar`, {});
  }
}
