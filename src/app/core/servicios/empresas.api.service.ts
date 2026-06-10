import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EmpresaDto {
  id: string;
  nombre: string;
  nit?: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  estrellas_promedio?: number;
  total_calificaciones?: number;
}

@Injectable({ providedIn: 'root' })
export class EmpresaApiService {
  private readonly base = `${environment.apiBaseUrl}/api`;
  private readonly empresaSubject = new BehaviorSubject<EmpresaDto | null>(null);

  get empresa$(): Observable<EmpresaDto | null> {
    return this.empresaSubject.asObservable();
  }

  constructor(private readonly http: HttpClient) {}

  getMyEmpresa(): Observable<EmpresaDto> {
    return this.http.get<EmpresaDto>(`${this.base}/empresa/me`);
  }

  updateUbicacion(latitud: number | null, longitud: number | null): Observable<EmpresaDto> {
    return this.http.patch<EmpresaDto>(`${this.base}/empresa/me/ubicacion`, {
      latitud,
      longitud,
    });
  }

  /**
   * Force refresh of cached empresa and update internal observable.
   */
  refreshMyEmpresa(): Observable<EmpresaDto> {
    return this.http.get<EmpresaDto>(`${this.base}/empresa/me`).pipe(
      tap((data) => this.empresaSubject.next(data)),
    );
  }
}
