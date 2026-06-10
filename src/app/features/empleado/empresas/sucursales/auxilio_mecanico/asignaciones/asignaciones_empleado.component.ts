import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../../services/auth/auth.service';
import { EmpleadoApiService, MiAsignacionDto } from '../../services/empleado.service';
import { IncidenteApiService, IncidenteDto } from '../../services/incidente.service';

type EstadoSolicitud = 'asignada' | 'aceptada' | 'en_proceso' | 'atendido' | 'cerrado' | 'finalizado' | string;
type DetalleMode = 'iniciar' | 'detalle' | 'marcarAtendida';

@Component({
  selector: 'app-asignaciones-empleado',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './asignaciones_empleado.component.html',
  styleUrls: ['./asignaciones_empleado.component.css'],
})
export class AsignacionesEmpleadoComponent implements OnInit {
  solicitudesAsignadas: MiAsignacionDto[] = [];
  solicitudesAtendidas: MiAsignacionDto[] = [];
  loading = false;

  detalleVisible = false;
  detalleLoading = false;
  savingState = false;
  detalleMode: DetalleMode = 'detalle';
  detalleSolicitud: IncidenteDto | null = null;
  detalleAsignacion: MiAsignacionDto | null = null;

  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    public readonly auth: AuthService,
    private readonly empleadoApi: EmpleadoApiService,
    private readonly incidenteApi: IncidenteApiService,
  ) {}

  ngOnInit(): void {
    console.log('[AsignacionesEmpleado] ngOnInit, currentUser:', this.auth.currentUser);
    if (!this.auth.currentUser?.empleado_id) {
      console.warn('[AsignacionesEmpleado] Usuario sin empleado_id asignado');
      this.mostrarMensaje('No tienes perfil de empleado asignado', 'error');
      this.loading = false;
      return;
    }
    this.cargarAsignaciones();
  }

  cargarAsignaciones(): void {
    this.loading = true;
    console.log('[AsignacionesEmpleado] Cargando asignaciones...');
    this.empleadoApi.getMyAsignaciones().subscribe({
      next: (items) => {
        console.log('[AsignacionesEmpleado] Respuesta recibida:', items);
        const ordenadas = [...(items || [])].sort(
          (a, b) => new Date(b.fecha_asignacion).getTime() - new Date(a.fecha_asignacion).getTime(),
        );
        this.solicitudesAsignadas = ordenadas.filter((item) => !this.esAtendida(item));
        this.solicitudesAtendidas = ordenadas.filter((item) => this.esAtendida(item));
        this.loading = false;
      },
      error: (err: any) => {
        console.error('[AsignacionesEmpleado] Error cargando asignaciones:', err);
        this.loading = false;
        this.mostrarMensaje('No se pudieron cargar tus asignaciones', 'error');
      },
    });
  }

  abrirDetalle(asignacion: MiAsignacionDto, mode: DetalleMode = 'detalle'): void {
    this.detalleVisible = true;
    this.detalleLoading = true;
    this.detalleMode = mode;
    this.detalleAsignacion = asignacion;
    this.detalleSolicitud = null;

    this.incidenteApi.get(asignacion.incidente_id).subscribe({
      next: (detalle) => {
        this.detalleSolicitud = detalle;
        this.detalleLoading = false;
      },
      error: () => {
        this.detalleLoading = false;
        this.mostrarMensaje('No se pudo cargar el detalle de la solicitud', 'error');
      },
    });
  }

  iniciarTarea(asignacion: MiAsignacionDto): void {
    this.abrirDetalle(asignacion, 'iniciar');
  }

  marcarAtendida(asignacion: MiAsignacionDto): void {
    this.abrirDetalle(asignacion, 'marcarAtendida');
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.detalleLoading = false;
    this.savingState = false;
    this.detalleMode = 'detalle';
    this.detalleSolicitud = null;
    this.detalleAsignacion = null;
  }

  iniciarTareaConUbicacion(): void {
    if (!this.detalleSolicitud) {
      return;
    }

    this.savingState = true;

    // Obtener ubicación actual del navegador
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitud = position.coords.latitude;
          const longitud = position.coords.longitude;
          this.cambiarEstadoAEnProceso(latitud, longitud);
        },
        (error) => {
          console.warn('No se pudo obtener ubicación GPS:', error);
          // Si no se puede obtener GPS, usar ubicación 0,0 como fallback
          this.cambiarEstadoAEnProceso(0, 0);
        },
      );
    } else {
      // Fallback si el navegador no soporta geolocation
      this.cambiarEstadoAEnProceso(0, 0);
    }
  }

  private cambiarEstadoAEnProceso(latitud: number, longitud: number): void {
    if (!this.detalleSolicitud) {
      return;
    }

    this.incidenteApi.updateEstadoConUbicacion(this.detalleSolicitud.id, {
      estado: 'en_proceso',
      latitud,
      longitud,
    }).subscribe({
      next: () => {
        this.savingState = false;
        this.mostrarMensaje('¡Excelente! Tarea iniciada', 'success');
        this.cerrarDetalle();
        this.cargarAsignaciones();
      },
      error: () => {
        this.savingState = false;
        this.mostrarMensaje('No se pudo iniciar la tarea', 'error');
      },
    });
  }

  confirmarMarcarAtendida(): void {
    if (!this.detalleSolicitud) {
      return;
    }

    this.savingState = true;
    this.incidenteApi.updateEstado(this.detalleSolicitud.id, { estado: 'atendido' }).subscribe({
      next: () => {
        this.savingState = false;
        this.mostrarMensaje('Solicitud marcada como atendida', 'success');
        this.cerrarDetalle();
        this.cargarAsignaciones();
      },
      error: () => {
        this.savingState = false;
        this.mostrarMensaje('No se pudo marcar como atendida', 'error');
      },
    });
  }

  verSeguimiento(): void {
    if (!this.detalleSolicitud) {
      return;
    }
    // Navegar a la pantalla de tracking
    window.location.href = `/tracking/${this.detalleSolicitud.id}`;
  }

  esAtendida(asignacion: MiAsignacionDto): boolean {
    const estado = this.normalizarEstado(asignacion.incidente_estado || asignacion.estado_tarea);
    return ['atendido', 'cerrado', 'finalizado', 'completado'].includes(estado);
  }

  etiquetaEstado(asignacion: MiAsignacionDto): string {
    const estado = this.normalizarEstado(asignacion.incidente_estado || asignacion.estado_tarea);
    if (estado === 'atendido' || estado === 'cerrado' || estado === 'finalizado' || estado === 'completado') {
      return 'Atendida';
    }
    if (estado === 'en_proceso') {
      return 'En proceso';
    }
    if (estado === 'aceptada') {
      return 'Aceptada';
    }
    return 'Asignada';
  }

  coordText(latitud?: number | null, longitud?: number | null): string {
    if (latitud == null || longitud == null) {
      return 'Sin ubicacion';
    }
    return `${latitud.toFixed(4)}, ${longitud.toFixed(4)}`;
  }

  public normalizarEstado(estado?: string | null): string {
    return (estado || '').trim().toLowerCase();
  }

  private mostrarMensaje(msg: string, tipo: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = tipo;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
}
