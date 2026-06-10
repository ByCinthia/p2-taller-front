import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

@Component({
  selector: 'app-admin-solicitudes-pendientes',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './solicitudes_pendientes.component.html',
  styleUrls: ['./solicitudes_pendientes.component.css'],
})
export class AdminSolicitudesPendientesComponent implements OnInit {
  items: IncidenteDto[] = [];
  loading = false;

  constructor(private api: IncidenteApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (data) => {
        const filtered = (data || []).filter((i) => (i.estado || 'pendiente') === 'pendiente');
        this.items = filtered.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
