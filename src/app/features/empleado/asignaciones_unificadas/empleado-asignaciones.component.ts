import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { EmpleadoApiService, MiAsignacionDto } from '../../../core/servicios/empleados.api.service';

@Component({
  selector: 'app-empleado-asignaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empleado-asignaciones.component.html',
  styleUrls: ['./empleado-asignaciones.component.css'],
})
export class EmpleadoAsignacionesComponent implements OnInit {
  tipoFiltro: string = 'asignadas';
  
  todasAsignaciones: MiAsignacionDto[] = [];
  asignacionesFiltradas: MiAsignacionDto[] = [];
  
  loading = false;
  errorMsg = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly empleadoApi: EmpleadoApiService
  ) {}

  ngOnInit(): void {
    // Escuchar cambios en la ruta para actualizar el filtro dinámicamente
    this.route.paramMap.subscribe(params => {
      this.tipoFiltro = params.get('tipoFiltro') || 'asignadas';
      if (this.todasAsignaciones.length > 0) {
        this.aplicarFiltro();
      } else {
        this.cargarDatos();
      }
    });
  }

  get tituloHeader(): string {
    if (this.tipoFiltro === 'curso') return 'Servicios en Curso';
    if (this.tipoFiltro === 'historial') return 'Historial de Servicios';
    return 'Mis asignaciones';
  }

  get descripcionHeader(): string {
    if (this.tipoFiltro === 'curso') return 'Solicitudes que estás atendiendo actualmente.';
    if (this.tipoFiltro === 'historial') return 'Registro de solicitudes pasadas.';
    return 'Nuevas solicitudes pendientes de atención.';
  }

  cargarDatos(): void {
    this.loading = true;
    this.errorMsg = '';
    
    this.empleadoApi.getMyAsignaciones().subscribe({
      next: (data) => {
        // Ordenar por fecha descendente
        this.todasAsignaciones = (data || []).sort(
          (a, b) => new Date(b.fecha_asignacion).getTime() - new Date(a.fecha_asignacion).getTime()
        );
        this.aplicarFiltro();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'Error al cargar las asignaciones.';
      }
    });
  }

  aplicarFiltro(): void {
    this.asignacionesFiltradas = this.todasAsignaciones.filter(item => {
      const estadoIncidente = (item.incidente_estado || '').toLowerCase();
      const estadoTarea = (item.estado_tarea || '').toLowerCase();
      
      if (this.tipoFiltro === 'curso') {
        return ['aceptada', 'en_camino', 'en_proceso', 'en_sitio'].includes(estadoTarea) ||
               ['en_proceso'].includes(estadoIncidente);
      } else if (this.tipoFiltro === 'historial') {
        return ['finalizada', 'completada', 'cancelada', 'rechazada'].includes(estadoTarea) ||
               ['finalizado', 'cancelado'].includes(estadoIncidente) ||
               ['atendido', 'cerrado'].includes(estadoTarea);
      } else {
        // Por defecto 'asignadas'
        // Es asignada si no es curso ni historial
        const isHistorial = ['finalizada', 'completada', 'cancelada', 'rechazada', 'atendido', 'cerrado'].includes(estadoTarea) ||
                            ['finalizado', 'cancelado'].includes(estadoIncidente);
        const isCurso = ['aceptada', 'en_camino', 'en_proceso', 'en_sitio'].includes(estadoTarea) ||
                        ['en_proceso'].includes(estadoIncidente);
        
        return !isHistorial && !isCurso;
      }
    });
  }

  verDetalle(item: MiAsignacionDto): void {
    // Redirigir a la vista de detalles real (puede ser un dialog o nueva ruta)
    // Para simplificar según requerimiento mínimo, delegamos a incidentes
    this.router.navigate(['/app/incidentes'], { queryParams: { id: item.incidente_id } });
  }
}
