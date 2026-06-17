import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Empleado, Servicio } from '../modelos/gestion_usuarios.modelos';

export interface MiAsignacionDto {
  incidente_id: string;
  incidente_tipo?: string | null;
  incidente_descripcion?: string | null;
  incidente_estado?: string | null;
  incidente_latitud?: number | null;
  incidente_longitud?: number | null;
  fecha_asignacion: string;
  estado_tarea: string;
  servicio_id?: string | null;
  servicio_nombre?: string | null;
}

/**
 * TTL en ms para el caché de asignaciones.
 * Pasado este tiempo, la siguiente llamada irá al backend.
 */
const CACHE_TTL_MS = 30_000; // 30 segundos

@Injectable({ providedIn: 'root' })
export class EmpleadoApiService {
  private readonly base = `${environment.apiBaseUrl}/api`;

  /** Caché de la última respuesta de /me/asignaciones */
  private _asignacionesCache$: Observable<MiAsignacionDto[]> | null = null;
  private _cacheTimestamp = 0;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.base}/empleados/`);
  }

  getMe(): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.base}/empleados/me/`);
  }

  /**
   * Retorna las asignaciones del empleado autenticado.
   * Usa caché en memoria con TTL de 30s para evitar peticiones duplicadas
   * al navegar entre Mis asignaciones / Servicio en Curso / Historial.
   */
  getMyAsignaciones(forzarRecarga = false): Observable<MiAsignacionDto[]> {
    const cacheValido =
      !forzarRecarga &&
      this._asignacionesCache$ !== null &&
      Date.now() - this._cacheTimestamp < CACHE_TTL_MS;

    if (cacheValido) {
      console.log('[EmpleadoApiService] Usando caché de asignaciones');
      return this._asignacionesCache$!;
    }

    console.log('[EmpleadoApiService] Fetching /me/asignaciones desde backend');
    this._cacheTimestamp = Date.now();
    this._asignacionesCache$ = this.http
      .get<MiAsignacionDto[]>(`${this.base}/empleados/me/asignaciones`)
      .pipe(
        tap((data) => console.log(`[EmpleadoApiService] ${data?.length ?? 0} asignaciones recibidas`)),
        shareReplay(1),
      );

    return this._asignacionesCache$;
  }

  /** Invalida el caché para que la próxima llamada vaya al backend */
  invalidarCacheAsignaciones(): void {
    this._asignacionesCache$ = null;
    this._cacheTimestamp = 0;
    console.log('[EmpleadoApiService] Caché de asignaciones invalidado');
  }

  listServicios(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(`${this.base}/servicios/`);
  }
}