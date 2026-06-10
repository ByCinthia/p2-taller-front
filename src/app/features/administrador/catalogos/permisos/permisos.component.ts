import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Permiso } from '../../models/user-management.models';

@Component({
  selector: 'app-permiso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './permisos.component.html',
  styleUrls: ['./permisos.component.css'],
})
export class PermisoComponent implements OnInit {
  permisos: Permiso[] = [];
  isCreateView = false;
  editingId: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_permiso');
  }

  ngOnInit(): void {
    this.route.url.subscribe((segments) => {
      this.isCreateView = segments.some((s) => s.path === 'nuevo');
      if (this.isCreateView) {
        this.resetForm();
      }
    });
    this.fetchPermisos();
  }

  fetchPermisos(): void {
    this.api.getPermisos().subscribe({
      next: (rows) => {
        this.permisos = rows;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar permisos.';
      },
    });
  }

  edit(permiso: Permiso): void {
    this.editingId = permiso.id;
    this.form.patchValue({
      nombre: permiso.nombre,
      descripcion: permiso.descripcion,
    });
  }

  openEdit(permiso: Permiso): void {
    this.edit(permiso);
    this.isCreateView = true;
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ nombre: '', descripcion: '' });
  }

  save(): void {
    if (!this.canManage || this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = this.form.getRawValue();
    const request$ = this.editingId
      ? this.api.updatePermiso(this.editingId, payload)
      : this.api.createPermiso(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchPermisos();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar permiso.';
      },
    });
  }

  remove(permiso: Permiso): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar permiso ${permiso.nombre}?`)) {
      return;
    }

    this.api.deletePermiso(permiso.id).subscribe({
      next: () => this.fetchPermisos(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar permiso.';
      },
    });
  }
}
