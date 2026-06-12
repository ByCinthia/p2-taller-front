import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PagosApiService, PagoDto } from '../../../core/servicios/pagos.api.service';
import { ToastService } from '../../../core/servicios/toast.service';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagos.component.html',
  styleUrls: ['./pagos.component.css'],
})
export class PagosComponent implements OnInit {
  pagos: PagoDto[] = [];
  loading = false;
  errorMsg = '';
  filterEstado = '';

  constructor(
    private readonly pagosApi: PagosApiService,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.pagosApi.list().subscribe({
      next: (data) => {
        this.pagos = data || [];
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || 'Error al cargar pagos.';
        this.loading = false;
      },
    });
  }

  get filteredPagos(): PagoDto[] {
    if (!this.filterEstado) return this.pagos;
    return this.pagos.filter((p) => p.estado === this.filterEstado);
  }

  confirmar(pagoId: string): void {
    this.pagosApi.confirmar(pagoId).subscribe({
      next: () => {
        this.toast.success('Pago confirmado', 'Pago confirmado correctamente.');
        this.load();
      },
      error: (err) => this.toast.error('Error', err?.error?.detail || 'Error al confirmar pago.'),
    });
  }

  rechazar(pagoId: string): void {
    this.pagosApi.rechazar(pagoId).subscribe({
      next: () => {
        this.toast.success('Pago rechazado', 'El pago ha sido rechazado.');
        this.load();
      },
      error: (err) => this.toast.error('Error', err?.error?.detail || 'Error al rechazar pago.'),
    });
  }

  getEstadoBadge(estado: string): string {
    switch (estado) {
      case 'confirmado': return 'badge-success';
      case 'pendiente': return 'badge-warning';
      case 'rechazado': return 'badge-danger';
      default: return 'badge-info';
    }
  }
}
