import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  constructor(
    public readonly auth: AuthService,
    private readonly empresaApi: EmpresaApiService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isClient) {
      // subscribe to empresa updates and request an initial refresh
      this.empresaApi.empresa$.subscribe({ next: (d) => (this.empresa = d), error: (err: any) => console.error(err) });
      this.empresaApi.refreshMyEmpresa().subscribe({ error: (err: any) => console.error('Error cargando datos de la empresa:', err) });
    }
  }

  get isEmpleadoTecnico(): boolean {
    return !this.auth.isClient && !this.auth.hasAdminPermission;
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
