import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Cargo } from '../../models/user-management.models';

@Component({
  selector: 'app-cargo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cargos.component.html',
  styleUrls: ['./cargos.component.css'],
})
export class CargoComponent implements OnInit {
  cargos: Cargo[] = [];
  isCreateView = false;
  editingId: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_cargo');
  }

  ngOnInit(): void {
    this.route.url.subscribe((segments) => {
      this.isCreateView = segments.some((s) => s.path === 'nuevo');
      if (this.isCreateView) {
        this.resetForm();
      }
    });
    this.fetchCargos();
  }

  fetchCargos(): void {
    this.api.getCargos().subscribe({
      next: (rows) => {
        this.cargos = rows;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar cargos.';
      },
    });
  }

  edit(cargo: Cargo): void {
    this.editingId = cargo.id;
    this.form.patchValue({
      nombre: cargo.nombre,
      descripcion: cargo.descripcion || '',
    });
  }

  openEdit(cargo: Cargo): void {
    this.edit(cargo);
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
      ? this.api.updateCargo(this.editingId, payload)
      : this.api.createCargo(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchCargos();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar cargo.';
      },
    });
  }

  remove(cargo: Cargo): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar cargo ${cargo.nombre}?`)) {
      return;
    }

    this.api.deleteCargo(cargo.id).subscribe({
      next: () => this.fetchCargos(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar cargo.';
      },
    });
  }
}