import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VehiculoDto {
  id: string;
  cliente_id: string;
  anio?: number;
  placa?: string;
  marca?: string;
  modelo?: string;
  principal?: boolean;
}

export interface ClienteDto {
  id: string;
  nombre: string;
  username?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
}

export interface ClienteCreatePayload {
  nombre: string;
  username: string;
  password: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
}

export interface ClienteUpdatePayload {
  nombre?: string;
  username?: string;
  password?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface TokenResponseWithCreds extends TokenResponse {
  username?: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class ClienteApiService {
  // Use API prefix so endpoints become e.g. http://localhost:8001/api/clientes
  private base = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) {}

  list(): Observable<ClienteDto[]> {
    return this.http.get<ClienteDto[]>(`${this.base}/clientes/`);
  }

  get(id: string): Observable<ClienteDto> {
    return this.http.get<ClienteDto>(`${this.base}/clientes/${id}/`);
  }

  create(payload: ClienteCreatePayload) {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/register/client/`, payload);
  }

  update(id: string, patch: ClienteUpdatePayload) {
    return this.http.put<ClienteDto>(`${this.base}/clientes/${id}/`, patch);
  }

  listVehiculos(clienteId: string) {
    return this.http.get<VehiculoDto[]>(`${this.base}/clientes/${clienteId}/vehiculos`);
  }

  getMe() {
    return this.http.get<ClienteDto>(`${this.base}/clientes/me/`);
  }

  updateMe(patch: ClienteUpdatePayload) {
    return this.http.put<ClienteDto>(`${this.base}/clientes/me/`, patch);
  }

  listMyVehiculos() {
    return this.http.get<VehiculoDto[]>(`${this.base}/clientes/me/vehiculos`);
  }

  createMyVehiculo(payload: Partial<VehiculoDto>) {
    return this.http.post<VehiculoDto>(`${this.base}/clientes/me/vehiculos`, payload);
  }

  createVehiculo(clienteId: string, payload: Partial<VehiculoDto>) {
    return this.http.post<VehiculoDto>(`${this.base}/clientes/me/vehiculos`, payload);
  }

  createVehiculoPublic(clienteId: string, payload: Partial<VehiculoDto>) {
    // public vehicle-by-client endpoint removed on server
    throw new Error('createVehiculoPublic removed: use admin vehicle endpoints or a dedicated mobile flow');
  }

  updateVehiculo(vehiculoId: string, patch: Partial<VehiculoDto>) {
    return this.http.put<VehiculoDto>(`${this.base}/vehiculos/${vehiculoId}/`, patch);
  }

  deleteVehiculo(vehiculoId: string) {
    return this.http.delete(`${this.base}/vehiculos/${vehiculoId}/`);
  }

  setPrincipal(vehiculoId: string) {
    return this.http.patch<VehiculoDto>(`${this.base}/vehiculos/${vehiculoId}/principal`, {});
  }

  getMyVehiculo(vehiculoId: string) {
    return this.http.get<VehiculoDto>(`${this.base}/clientes/me/vehiculos/${vehiculoId}`);
  }

  deleteMyVehiculo(vehiculoId: string) {
    return this.http.delete(`${this.base}/clientes/me/vehiculos/${vehiculoId}`);
  }

  countMyVehiculos() {
    return this.http.get<{ count: number }>(`${this.base}/clientes/me/vehiculos/count`);
  }

  getHistorial(clienteId: string) {
    return this.http.get<any[]>(`${this.base}/clientes/${clienteId}/historial`);
  }

  // Admin vehiculo endpoints
  listAllVehiculos() {
    return this.http.get<VehiculoDto[]>(`${this.base}/vehiculos/`);
  }

  listVehiculosAtendidos() {
    return this.http.get<VehiculoDto[]>(`${this.base}/vehiculos/atendidos`);
  }
}
