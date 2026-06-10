import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Permiso, Rol } from '../../models/user-management.models';

@Component({
  selector: 'app-rol',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css'],
})
export class RolComponent implements OnInit {
  roles: Rol[] = [];
  isCreateView = false;
  permisosCatalogo: Permiso[] = [];
  selectedPermissionIds = new Set<string>();
  editingId: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_rol');
  }

  ngOnInit(): void {
    this.route.url.subscribe((segments) => {
      this.isCreateView = segments.some((s) => s.path === 'nuevo');
      if (this.isCreateView) {
        this.resetForm();
      }
    });
    this.fetchAll();
  }

  fetchAll(): void {
    this.api.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar roles.';
      },
    });

    this.api.getPermisos().subscribe({
      next: (permisos) => {
        this.permisosCatalogo = permisos;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar permisos del catalogo.';
      },
    });
  }

  togglePermission(permissionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedPermissionIds.add(permissionId);
    } else {
      this.selectedPermissionIds.delete(permissionId);
    }
  }

  edit(rol: Rol): void {
    this.editingId = rol.id;
    this.form.patchValue({ nombre: rol.nombre });
    this.selectedPermissionIds = new Set(rol.permisos.map((p) => p.id));
  }

  openEdit(rol: Rol): void {
    this.edit(rol);
    this.isCreateView = true;
  }

  resetForm(): void {
    this.editingId = null;
    this.selectedPermissionIds = new Set<string>();
    this.form.reset({ nombre: '' });
  }

  save(): void {
    if (!this.canManage || this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = {
      nombre: this.form.getRawValue().nombre,
      permisos: Array.from(this.selectedPermissionIds),
    };

    const request$ = this.editingId
      ? this.api.updateRole(this.editingId, payload)
      : this.api.createRole(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchAll();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar rol.';
      },
    });
  }

  remove(rol: Rol): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar rol ${rol.nombre}?`)) {
      return;
    }

    this.api.deleteRole(rol.id).subscribe({
      next: () => this.fetchAll(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar rol.';
      },
    });
  }
}
