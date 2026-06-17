import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Cargo, Empleado, Rol } from '../../models/user-management.models';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './empleados.component.html',
  styleUrls: ['./empleados.component.css'],
})
export class EmpleadoComponent implements OnInit {
  empleados: Empleado[] = [];
  isCreateView = false;
  cargosCatalogo: Cargo[] = [];
  rolesCatalogo: Rol[] = [];
  selectedRoleIds = new Set<string>();
  selectedFile: File | null = null;

  loading = false;
  errorMsg = '';
  editingId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    nombre_completo: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    ci: ['', Validators.required],
    direccion: [''],
    telefono: [''],
    sueldo: [0, Validators.required],
    cargo: [''],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_empleado');
  }

  ngOnInit(): void {
    if (this.auth.isEmpleadoTecnico) {
      this.router.navigate(['/app/empleado/perfil']);
      return;
    }

    this.route.url.subscribe((segments) => {
      this.isCreateView = segments.some((s) => s.path === 'nuevo');
      if (this.isCreateView) {
        this.resetForm();
      }
    });
    this.fetchAll();
  }

  fetchAll(): void {
    this.api.getEmpleados().subscribe({
      next: (rows) => {
        this.empleados = rows;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar empleados.';
      },
    });

    this.api.getRoles().subscribe({
      next: (rows) => {
        this.rolesCatalogo = rows;
      },
      error: () => undefined,
    });

    this.api.getCargos().subscribe({
      next: (rows) => {
        this.cargosCatalogo = rows;
      },
      error: () => undefined,
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  toggleRole(roleId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedRoleIds.add(roleId);
    } else {
      this.selectedRoleIds.delete(roleId);
    }
  }

  edit(emp: Empleado): void {
    this.editingId = emp.id;
    this.form.patchValue({
      nombre_completo: emp.nombre_completo,
      email: emp.usuario.email,
      ci: emp.ci,
      direccion: emp.direccion || '',
      telefono: emp.telefono || '',
      sueldo: emp.sueldo,
      cargo: emp.cargo || '',
    });

    this.selectedRoleIds = new Set(emp.roles || emp.roles_asignados.map((r) => r.id));
  }

  openEdit(emp: Empleado): void {
    this.edit(emp);
    this.isCreateView = true;
  }

  resetForm(): void {
    this.editingId = null;
    this.selectedRoleIds = new Set<string>();
    this.selectedFile = null;
    this.form.reset({
      nombre_completo: '',
      email: '',
      ci: '',
      direccion: '',
      telefono: '',
      sueldo: 0,
      cargo: '',
    });
  }

  private buildFormData(): FormData {
    const raw = this.form.getRawValue();
    const data = new FormData();

    console.log('buildFormData - raw values:', raw);

    data.append('nombre_completo', `${raw.nombre_completo ?? ''}`);
    data.append('email', `${raw.email ?? ''}`);
    data.append('ci', `${raw.ci ?? ''}`);
    data.append('direccion', `${raw.direccion ?? ''}`);
    data.append('telefono', `${raw.telefono ?? ''}`);
    data.append('sueldo', `${raw.sueldo ?? 0}`);
    data.append('cargo', `${raw.cargo ?? ''}`);

    const logFormData = (formData: FormData): Array<[string, FormDataEntryValue]> => {
      const entries: Array<[string, FormDataEntryValue]> = [];

      formData.forEach((value, key) => {
        entries.push([key, value]);
      });

      return entries;
    };

    console.log('FormData entries:', logFormData(data));

    Array.from(this.selectedRoleIds).forEach((roleId) => data.append('roles', roleId));

    console.log('With roles:', logFormData(data));

    if (this.selectedFile) {
      data.append('foto_perfil', this.selectedFile);
    }

    return data;
  }

  save(): void {
    console.log('Save clicked - canManage:', this.canManage, 'form.invalid:', this.form.invalid);
    
    if (!this.canManage) {
      console.error('No tienes permiso manage_empleado');
      this.errorMsg = 'No tienes permiso para gestionar empleados.';
      return;
    }

    if (this.form.invalid) {
      console.error('Formulario inválido:', this.form.errors);
      this.errorMsg = 'Por favor completa todos los campos correctamente.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = this.buildFormData();
    console.log('Enviando payload...');
    const request$ = this.editingId
      ? this.api.updateEmpleado(this.editingId, payload)
      : this.api.createEmpleado(payload);

    request$.subscribe({
      next: () => {
        console.log('Guardado exitosamente');
        this.loading = false;
        this.resetForm();
        this.fetchAll();
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar empleado.';
      },
    });
  }

  remove(emp: Empleado): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar empleado ${emp.usuario.username}?`)) {
      return;
    }

    this.api.deleteEmpleado(emp.id).subscribe({
      next: () => this.fetchAll(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar empleado.';
      },
    });
  }
}
