import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cargo, Empleado, Permiso, Rol, Servicio } from '../modelos/gestion_usuarios.modelos';

@Injectable({ providedIn: 'root' })
export class UserManagementApiService {
  private readonly base = `${environment.apiBaseUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  getEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.base}/empleados/`);
  }

  createEmpleado(payload: FormData): Observable<Empleado> {
    return this.http.post<Empleado>(`${this.base}/empleados/`, payload);
  }

  updateEmpleado(id: string, payload: FormData | Record<string, unknown>): Observable<Empleado> {
    return this.http.patch<Empleado>(`${this.base}/empleados/${id}/`, payload);
  }

  deleteEmpleado(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/empleados/${id}/`);
  }

  getCargos(): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(`${this.base}/cargos/`);
  }

  getCargoById(id: string): Observable<Cargo> {
    return this.http.get<Cargo>(`${this.base}/cargos/${id}/`);
  }

  createCargo(payload: { nombre: string; descripcion: string | null }): Observable<Cargo> {
    return this.http.post<Cargo>(`${this.base}/cargos/`, payload);
  }

  updateCargo(id: string, payload: Partial<{ nombre: string; descripcion: string | null }>): Observable<Cargo> {
    return this.http.patch<Cargo>(`${this.base}/cargos/${id}/`, payload);
  }

  deleteCargo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/cargos/${id}/`);
  }

  getServicios(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(`${this.base}/servicios/`);
  }

  getServicioById(id: string): Observable<Servicio> {
    return this.http.get<Servicio>(`${this.base}/servicios/${id}/`);
  }

  createServicio(payload: { nombre: string; descripcion: string | null; activo: boolean }): Observable<Servicio> {
    return this.http.post<Servicio>(`${this.base}/servicios/`, payload);
  }

  updateServicio(
    id: string,
    payload: Partial<{ nombre: string; descripcion: string | null; activo: boolean }>,
  ): Observable<Servicio> {
    return this.http.patch<Servicio>(`${this.base}/servicios/${id}/`, payload);
  }

  deleteServicio(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/servicios/${id}/`);
  }

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.base}/roles/`);
  }

  getRoleById(id: string): Observable<Rol> {
    return this.http.get<Rol>(`${this.base}/roles/${id}/`);
  }

  createRole(payload: { nombre: string; permisos: string[] }): Observable<Rol> {
    return this.http.post<Rol>(`${this.base}/roles/`, payload);
  }

  updateRole(id: string, payload: Partial<{ nombre: string; permisos: string[] }>): Observable<Rol> {
    return this.http.patch<Rol>(`${this.base}/roles/${id}/`, payload);
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/roles/${id}/`);
  }

  getPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.base}/permisos/`);
  }

  getPermisoById(id: string): Observable<Permiso> {
    return this.http.get<Permiso>(`${this.base}/permisos/${id}/`);
  }

  createPermiso(payload: { nombre: string; descripcion: string }): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.base}/permisos/`, payload);
  }

  updatePermiso(id: string, payload: Partial<{ nombre: string; descripcion: string }>): Observable<Permiso> {
    return this.http.patch<Permiso>(`${this.base}/permisos/${id}/`, payload);
  }

  deletePermiso(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/permisos/${id}/`);
  }
}
