import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

@Component({
  selector: 'app-admin-solicitudes-enproceso',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './solicitudes_en_proceso.component.html',
  styleUrls: ['./solicitudes_en_proceso.component.css'],
})
export class AdminSolicitudesEnProcesoComponent implements OnInit {
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
        const filtered = (data || []).filter((i) => (i.estado || '').toLowerCase() === 'en_proceso');
        this.items = filtered.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
