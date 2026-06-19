import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { EmpresaApiService, EmpresaDto } from '../../servicios/empresas.api.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './barra_lateral.component.html',
  styleUrls: ['./barra_lateral.component.css'],
})
export class SidebarComponent implements OnInit {
  empresa: EmpresaDto | null = null;
  isAdminView = false;
  isEmpleadoView = false;
  isClientView = false;
  hasAdminPermission = false;

  constructor(
    public readonly auth: AuthService,
    private readonly empresaApi: EmpresaApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Escuchar cambios en el token decodificado y permisos para reconstruir el menú reactivamente
    this.auth.decodedToken$.subscribe(() => this.updateViewFlags());
    this.auth.permissions$.subscribe(() => this.updateViewFlags());

    // Suscribirse a cambios de la empresa si no es cliente
    this.empresaApi.empresa$.subscribe({ 
      next: (d) => {
        this.empresa = d;
        this.cdr.detectChanges();
      }, 
      error: (err: any) => console.error(err) 
    });

    // Cargar/actualizar datos iniciales de la empresa si no es cliente
    if (!this.auth.isClient) {
      this.empresaApi.refreshMyEmpresa().subscribe({ 
        error: (err: any) => console.error('Error cargando datos de la empresa:', err) 
      });
    }
  }

  private updateViewFlags(): void {
    this.isClientView = !!this.auth.isClient;
    this.isEmpleadoView = !!this.auth.isEmpleadoTecnico;
    this.isAdminView = !this.isClientView && !this.isEmpleadoView;
    this.hasAdminPermission = !!this.auth.hasAdminPermission;
    this.cdr.detectChanges();
  }

  getStarArray(rating: number | undefined): number[] {
    if (!rating) return [];
    const rounded = Math.round(rating);
    return Array(5).fill(0).map((_, i) => i < rounded ? 1 : 0);
  }

  logout(): void {
    this.auth.logout();
  }
}

