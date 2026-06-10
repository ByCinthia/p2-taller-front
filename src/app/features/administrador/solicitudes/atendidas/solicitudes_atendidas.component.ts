import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

@Component({
  selector: 'app-admin-solicitudes-atendidas',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './solicitudes_atendidas.component.html',
  styleUrls: ['./solicitudes_atendidas.component.css'],
})
export class AdminSolicitudesAtendidasComponent implements OnInit {
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
        const closedStates = ['atendido', 'cerrado', 'finalizado'];
        const filtered = (data || []).filter((i) => closedStates.includes((i.estado || '').toLowerCase()));
        this.items = filtered.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
