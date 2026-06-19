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
    this.isAdminView = !!this.auth.isAdmin;
    this.isClientView = !!this.auth.isClient;
    this.hasAdminPermission = !!this.auth.hasAdminPermission;
    this.isEmpleadoView = !this.isClientView && !this.hasAdminPermission;

    if (!this.isClientView) {
      // subscribe to empresa updates and request an initial refresh
      this.empresaApi.empresa$.subscribe({ 
        next: (d) => {
          this.empresa = d;
          this.cdr.detectChanges();
        }, 
        error: (err: any) => console.error(err) 
      });
      this.empresaApi.refreshMyEmpresa().subscribe({ error: (err: any) => console.error('Error cargando datos de la empresa:', err) });
    }
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
