import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Servicio } from '../../models/user-management.models';
import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';

@Component({
  selector: 'app-servicio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './servicios.component.html',
  styleUrls: ['./servicios.component.css'],
})
export class ServicioComponent implements OnInit {
  servicios: Servicio[] = [];
  isCreateView = false;
  editingId: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    activo: [true],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_servicio');
  }

  ngOnInit(): void {
    this.route.url.subscribe((segments) => {
      this.isCreateView = segments.some((s) => s.path === 'nuevo');
      if (this.isCreateView) {
        this.resetForm();
      }
    });
    this.fetchServicios();
  }

  fetchServicios(): void {
    this.api.getServicios().subscribe({
      next: (rows) => {
        this.servicios = rows;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar servicios.';
      },
    });
  }

  edit(servicio: Servicio): void {
    this.editingId = servicio.id_servicio;
    this.form.patchValue({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      activo: servicio.activo,
    });
  }

  openEdit(servicio: Servicio): void {
    this.edit(servicio);
    this.isCreateView = true;
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ nombre: '', descripcion: '', activo: true });
  }

  save(): void {
    if (!this.canManage || this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = this.form.getRawValue();
    const request$ = this.editingId
      ? this.api.updateServicio(this.editingId, payload)
      : this.api.createServicio(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchServicios();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar servicio.';
      },
    });
  }

  remove(servicio: Servicio): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar servicio ${servicio.nombre}?`)) {
      return;
    }

    this.api.deleteServicio(servicio.id_servicio).subscribe({
      next: () => this.fetchServicios(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar servicio.';
      },
    });
  }
}
