import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ClienteApiService } from '../../services/cliente.service';
import type { VehiculoDto, ClienteDto } from '../../services/cliente.service';

@Component({
  selector: 'app-vehiculos',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './vehiculos.component.html',
  styleUrls: ['./vehiculos.component.css'],
})
export class VehiculosComponent implements OnInit {
  vehiculos: Array<VehiculoDto & { cliente_nombre?: string }> = [];
  loading = false;

  constructor(private api: ClienteApiService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.api.list().subscribe({
      next: (clients: ClienteDto[]) => {
        const calls = (clients || []).map((c) => this.api.listVehiculos(c.id));
        if (calls.length === 0) {
          this.vehiculos = [];
          this.loading = false;
          return;
        }
        forkJoin(calls).subscribe({
          next: (arrays) => {
            const flat = ([] as VehiculoDto[]).concat(...arrays.map((a) => a || []));
            const clientMap = new Map((clients || []).map((c) => [c.id, c.nombre]));
            this.vehiculos = flat.map((v) => ({ ...v, cliente_nombre: clientMap.get(v.cliente_id || '') }));
            this.loading = false;
          },
          error: () => (this.loading = false),
        });
      },
      error: () => (this.loading = false),
    });
  }

  makePrincipal(v: VehiculoDto) {
    this.api.setPrincipal(v.id).subscribe({ next: () => this.loadAll() });
  }

  edit(v: VehiculoDto): void {
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
    }).subscribe({ next: () => this.loadAll() });
  }

  remove(v: VehiculoDto) {
    if (!window.confirm(`Eliminar vehículo ${v.placa || v.id}?`)) {
      return;
    }
    this.api.deleteVehiculo(v.id).subscribe({ next: () => this.loadAll() });
  }
}
