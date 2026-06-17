import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

@Component({
  selector: 'app-incident-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial_solicitudes.component.html',
  styleUrls: ['./historial_solicitudes.component.css'],
})
export class IncidentHistoryComponent implements OnInit {
  incidents: IncidenteDto[] = [];
  loading = false;
  errorMsg = '';

  constructor(
    private readonly incidenteApi: IncidenteApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.incidenteApi.list().subscribe({
      next: (incidents) => {
        this.incidents = incidents || [];
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudieron cargar las solicitudes.';
      },
    });
  }

  viewTracking(incidenteId: string): void {
    this.router.navigate(['/app/incidentes', incidenteId, 'tracking']);
  }
}
