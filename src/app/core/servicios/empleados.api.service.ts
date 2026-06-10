import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class EmpleadoApiService {
  private readonly base = `${environment.apiBaseUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.base}/empleados/`);
  }

  getMe(): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.base}/empleados/me/`);
  }

  getMyAsignaciones(): Observable<MiAsignacionDto[]> {
    return this.http.get<MiAsignacionDto[]>(`${this.base}/empleados/me/asignaciones`);
  }

  listServicios(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(`${this.base}/servicios/`);
  }
}