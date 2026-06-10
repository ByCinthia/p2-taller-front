import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';

import { ClienteApiService } from '../../services/cliente.service';
import type { ClienteDto, VehiculoDto } from '../../services/cliente.service';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './detalle_cliente.component.html',
  styleUrls: ['./detalle_cliente.component.css'],
})
export class ClienteDetailComponent implements OnInit {
  clienteId = '';
  cliente: ClienteDto | undefined;
  vehiculos: VehiculoDto[] = [];
  loading = false;
  loadingVehiculos = false;
  isEditMode = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.maxLength(30)]],
    activo: [true],
    vehiculo_marca: [''],
    vehiculo_modelo: [''],
    vehiculo_placa: [''],
    vehiculo_anio: [null as number | null],
    vehiculo_principal: [true],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ClienteApiService,
    private readonly fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      return;
    }

    this.clienteId = id;
    this.route.queryParamMap.subscribe((params) => {
      this.isEditMode = params.get('mode') === 'edit';
    });

    this.api.get(id).subscribe({
      next: (c) => {
        this.cliente = c;
        this.form.patchValue({
          email: c.email || '',
          telefono: c.telefono || '',
          activo: c.activo !== false,
        });
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar el cliente.';
      },
    });

    this.loadVehiculos(id);
  }

  loadVehiculos(id: string) {
    this.loadingVehiculos = true;
    this.api.listVehiculos(id).subscribe({
      next: (rows) => {
        this.vehiculos = rows || [];
        this.loadingVehiculos = false;
      },
      error: () => (this.loadingVehiculos = false),
    });
  }

  saveCliente(): void {
    if (!this.cliente || this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const raw = this.form.getRawValue();
    const clientePayload = {
      email: this.optional(raw.email),
      telefono: this.optional(raw.telefono),
      activo: !!raw.activo,
    };

    const vehiculoPayload = {
      marca: this.optional(raw.vehiculo_marca),
      modelo: this.optional(raw.vehiculo_modelo),
      placa: this.optional(raw.vehiculo_placa),
      anio: raw.vehiculo_anio ?? undefined,
    };
    const hasVehiculo = Boolean(
      vehiculoPayload.marca || vehiculoPayload.modelo || vehiculoPayload.placa || vehiculoPayload.anio,
    );
    const markPrincipal = !!raw.vehiculo_principal;

    this.api.update(this.cliente.id, clientePayload).subscribe({
      next: (updated) => {
        this.cliente = updated;

        if (!hasVehiculo) {
          this.loading = false;
          this.form.patchValue({
            vehiculo_marca: '',
            vehiculo_modelo: '',
            vehiculo_placa: '',
            vehiculo_anio: null,
            vehiculo_principal: true,
          });
          return;
        }

        this.api.createVehiculo(this.clienteId, vehiculoPayload).subscribe({
          next: (vehiculo) => {
            if (!markPrincipal) {
              this.loading = false;
              this.loadVehiculos(this.clienteId);
              this.form.patchValue({
                vehiculo_marca: '',
                vehiculo_modelo: '',
                vehiculo_placa: '',
                vehiculo_anio: null,
                vehiculo_principal: true,
              });
              return;
            }

            this.api.setPrincipal(vehiculo.id).subscribe({
              next: () => {
                this.loading = false;
                this.loadVehiculos(this.clienteId);
                this.form.patchValue({
                  vehiculo_marca: '',
                  vehiculo_modelo: '',
                  vehiculo_placa: '',
                  vehiculo_anio: null,
                  vehiculo_principal: true,
                });
              },
              error: (error) => {
                this.loading = false;
                this.errorMsg = error?.error?.detail || 'Cliente actualizado, pero no se pudo marcar el vehiculo como principal.';
              },
            });
          },
          error: (error) => {
            this.loading = false;
            this.errorMsg = error?.error?.detail || 'Cliente actualizado, pero no se pudo registrar el vehiculo.';
          },
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo actualizar el cliente.';
      },
    });
  }

  setPrincipal(v: VehiculoDto) {
    this.api.setPrincipal(v.id).subscribe({ next: () => this.loadVehiculos(v.cliente_id) });
  }

  editVehiculo(v: VehiculoDto): void {
    const marca = prompt('Marca', v.marca || '') ?? v.marca ?? '';
    const modelo = prompt('Modelo', v.modelo || '') ?? v.modelo ?? '';
    const placa = prompt('Placa', v.placa || '') ?? v.placa ?? '';
    const anioInput = prompt('Año', v.anio ? String(v.anio) : '') ?? (v.anio ? String(v.anio) : '');
    const anio = anioInput.trim() ? Number(anioInput) : undefined;

    this.api.updateVehiculo(v.id, {
      marca: marca || undefined,
      modelo: modelo || undefined,
      placa: placa || undefined,
      anio: Number.isNaN(anio) ? undefined : anio,
    }).subscribe({ next: () => this.loadVehiculos(v.cliente_id) });
  }

  removeVehiculo(v: VehiculoDto) {
    if (!window.confirm(`Eliminar vehículo ${v.placa || v.id}?`)) {
      return;
    }
    this.api.deleteVehiculo(v.id).subscribe({ next: () => this.loadVehiculos(v.cliente_id) });
  }

  private optional(value: string): string | undefined {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }
}
