import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

import {
  IncidenteApiService,
  IncidenteDto,
  TecnicoCercanoDto,
  AsignarTecnicoRequest,
  IncidenteCreateRequest,
} from '../../services/incidente.service';
import { ClienteApiService, VehiculoDto } from '../../services/cliente.service';
import { AuthService } from '../../services/auth/auth.service';
import { EmpleadoApiService, MiAsignacionDto } from '../../services/empleado.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { EmpresaApiService } from '../../../../../../core/servicios/empresas.api.service';
import type { Servicio } from '../../models/user-management.models';
import type { Empleado } from '../../models/user-management.models';

@Component({
  selector: 'app-incidentes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './solicitud_incidentes.component.html',
  styleUrls: ['./solicitud_incidentes.component.css'],
})
export class IncidentesComponent implements OnInit {
  private routeRoleView: 'empleado' | 'admin' | 'cliente' | null = null;

  incidents: IncidenteDto[] = [];
  incidentsNuevas: IncidenteDto[] = [];
  incidentsAtendidas: IncidenteDto[] = [];
  assignedIncidents: MiAsignacionDto[] = [];
  servicios: Servicio[] = [];
  empleadosAsignables: Empleado[] = [];
  tecnicosCercanos: TecnicoCercanoDto[] = [];

  loading = false;
  cargandoTecnicos = false;
  cargandoEmpleados = false;
  asignando = false;
  updatingLocation = false;

  miDisponible = true;
  ultimaUbicacionActualizada: Date | null = null;

  message = '';
  messageType: 'success' | 'error' = 'success';

  modalAsignarVisible = false;
  modalIncidentes: IncidenteDto | null = null;
  servicioSeleccionadoId = '';

  // Admin tabs state
  activeAdminTab: 'pendientes' | 'asignadas' | 'en_proceso' | 'atendidas' = 'pendientes';

  setAdminTab(tab: 'pendientes' | 'asignadas' | 'en_proceso' | 'atendidas'): void {
    this.activeAdminTab = tab;
  }

  constructor(
    private api: IncidenteApiService,
    public readonly auth: AuthService,
    private readonly empresaApi: EmpresaApiService,
    private empleadoApi: EmpleadoApiService,
    private clienteApi: ClienteApiService,
    private userManagementApi: UserManagementApiService,
    private readonly route: ActivatedRoute,
  ) {}

  // --- Create incident (client) state
  creating = false;
  createForm: IncidenteCreateRequest = {
    vehiculo_id: undefined,
    tipo: '',
    descripcion: '',
    latitud: undefined,
    longitud: undefined,
  };
  myVehiculos: VehiculoDto[] = [];
  evidenciaFiles: File[] = [];
  uploadingEvidencias = false;

  get isClientView(): boolean {
    if (this.routeRoleView === 'cliente') {
      return true;
    }
    return this.auth.isClient;
  }

  get isAdminView(): boolean {
    if (this.routeRoleView === 'admin') {
      return true;
    }
    if (this.routeRoleView === 'empleado') {
      return false;
    }
    return this.auth.isAdmin;
  }

  get isEmpleadoView(): boolean {
    if (this.routeRoleView === 'empleado') {
      return true;
    }
    return !!this.auth.currentUser?.empleado_id && !this.auth.isAdmin && !this.auth.isClient;
  }

  get incidentsSectionTitle(): string {
    if (this.isEmpleadoView) {
      return 'Solicitudes asignadas';
    }
    if (this.auth.isClient) {
      return 'Mis solicitudes';
    }
    return 'Incidentes pendientes';
  }

  get incidentsCounterLabel(): string {
    if (this.isEmpleadoView) {
      return `${this.incidents.length} solicitud(es) asignada(s)`;
    }
    if (this.isClientView) {
      return `${this.incidents.length} solicitud(es) registradas`;
    }
    return `${this.incidents.length} solicitud(es) sin asignar`;
  }

  get loadingMessage(): string {
    return this.isEmpleadoView ? 'Cargando asignaciones...' : 'Cargando incidentes...';
  }

  get emptyMessage(): string {
    if (this.isEmpleadoView) {
      return 'No tienes solicitudes asignadas';
    }
    if (this.isClientView) {
      return 'No tienes incidentes registrados';
    }
    return 'No hay incidentes pendientes';
  }

  ngOnInit(): void {
    this.routeRoleView = (this.route.snapshot.data['roleView'] as 'empleado' | 'admin' | 'cliente' | undefined) || null;
    console.log('[solicitud_incidentes] routeRoleView:', this.routeRoleView);
    console.log('[solicitud_incidentes] isEmpleadoView:', this.isEmpleadoView);
    console.log('[solicitud_incidentes] isAdminView:', this.isAdminView);
    console.log('[solicitud_incidentes] isClientView:', this.isClientView);
    console.log('[solicitud_incidentes] auth.currentUser.empleado_id:', this.auth.currentUser?.empleado_id);
    this.cargarIncidentes();
    this.cargarServicios();
    if (this.isClientView) {
      this.cargarMisVehiculos();
    }
  }

  cargarIncidentes(): void {
    this.loading = true;
    console.log('[cargarIncidentes] isEmpleadoView:', this.isEmpleadoView, 'routeRoleView:', this.routeRoleView);
    if (this.isEmpleadoView) {
      console.log('[cargarIncidentes] Loading as EMPLEADO - calling getMyAsignaciones');
      this.empleadoApi.getMyAsignaciones().subscribe({
        next: (items) => {
          console.log('[cargarIncidentes] Received asignaciones:', items);
          this.assignedIncidents = items || [];
          this.incidents = this.assignedIncidents.map((item) => this.mapAsignacionToIncidente(item));
          this.loading = false;
        },
        error: (err: any) => {
          console.error('[cargarIncidentes] Error loading asignaciones:', err);
          this.mostrarMensaje('Error al cargar tus asignaciones', 'error');
          this.loading = false;
        },
      });
      return;
    }

    this.api.list().subscribe({
      next: (data) => {
        if (this.isAdminView) {
          // Separar en nuevas y atendidas para admin
          // Incluir variantes de 'asignada'/'asignado' además de pendientes y en_proceso
          this.incidentsNuevas = (data || []).filter((inc) =>
            [
              'pendiente',
              'en_proceso',
              'asignada',
              'asignado',
              'aceptada',
            ].includes(inc.estado?.toLowerCase() || ''),
          );
          this.incidentsAtendidas = (data || []).filter((inc) => ['atendido', 'cerrado', 'finalizado', 'completado'].includes(inc.estado?.toLowerCase() || ''));
          this.incidents = data;
        } else {
          this.incidents = data;
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.mostrarMensaje('Error al cargar incidentes', 'error');
        this.loading = false;
      },
    });
  }

  private mapAsignacionToIncidente(asignacion: MiAsignacionDto): IncidenteDto {
    return {
      id: asignacion.incidente_id,
      tipo: asignacion.incidente_tipo || 'Solicitud',
      descripcion: asignacion.incidente_descripcion || 'Sin descripción',
      estado: asignacion.incidente_estado || asignacion.estado_tarea || 'asignada',
      latitud: asignacion.incidente_latitud ?? undefined,
      longitud: asignacion.incidente_longitud ?? undefined,
      creado_en: asignacion.fecha_asignacion,
      prioridad: undefined,
      vehiculo_id: undefined,
      cliente_id: undefined,
    };
  }

  cargarServicios(): void {
    this.userManagementApi.getServicios().subscribe({
      next: (data) => {
        this.servicios = data || [];
        if (!this.servicioSeleccionadoId && this.servicios.length > 0) {
          this.servicioSeleccionadoId = this.servicios[0].id_servicio;
        }
      },
      error: () => {
        this.mostrarMensaje('Error al cargar servicios', 'error');
      },
    });
  }

  // --- Cliente: cargar vehiculos y manejo de creacion
  cargarMisVehiculos(): void {
    this.clienteApi.listMyVehiculos().subscribe({
      next: (lista) => (this.myVehiculos = lista || []),
      error: () => (this.myVehiculos = []),
    });
  }

  setLocationFromGeolocation(): void {
    if (!navigator.geolocation) {
      this.mostrarMensaje('Geolocalización no disponible', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.createForm.latitud = pos.coords.latitude;
        this.createForm.longitud = pos.coords.longitude;
      },
      () => this.mostrarMensaje('No se pudo obtener tu ubicación', 'error'),
    );
  }

  onEvidenciaFiles(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files) return;
    this.evidenciaFiles = Array.from(input.files);
  }

  resetCreateForm(): void {
    this.createForm = { vehiculo_id: undefined, tipo: '', descripcion: '', latitud: undefined, longitud: undefined };
    this.evidenciaFiles = [];
  }

  createIncident(): void {
    if (!this.createForm.tipo) {
      this.mostrarMensaje('Seleccione el tipo de incidente', 'error');
      return;
    }
    this.creating = true;
    this.api.create(this.createForm).subscribe({
      next: (created) => {
        if (this.evidenciaFiles.length > 0) {
          this.uploadingEvidencias = true;
          const uploads = this.evidenciaFiles.map((f) => firstValueFrom(this.api.uploadEvidenciaArchivo(created.id, f)));
          Promise.all(uploads)
            .then(() => {
              this.uploadingEvidencias = false;
              this.mostrarMensaje('Solicitud creada con evidencias', 'success');
              this.resetCreateForm();
              this.cargarIncidentes();
              this.creating = false;
            })
            .catch(() => {
              this.uploadingEvidencias = false;
              this.mostrarMensaje('Solicitud creada pero falló subir evidencias', 'error');
              this.resetCreateForm();
              this.cargarIncidentes();
              this.creating = false;
            });
        } else {
          this.mostrarMensaje('Solicitud creada', 'success');
          this.resetCreateForm();
          this.cargarIncidentes();
          this.creating = false;
        }
      },
      error: () => {
        this.mostrarMensaje('Error al crear la solicitud', 'error');
        this.creating = false;
      },
    });
  }

  cargarEmpleadosAsignables(): void {
    this.cargandoEmpleados = true;
    this.empleadoApi.list().subscribe({
      next: (data: Empleado[]) => {
        this.empleadosAsignables = data || [];
        this.cargandoEmpleados = false;
      },
      error: () => {
        this.cargandoEmpleados = false;
        this.mostrarMensaje('Error al cargar empleados', 'error');
      },
    });
  }

  actualizarMiUbicacion(): void {
    if (!navigator.geolocation) {
      this.mostrarMensaje('GeolocalizaciÃ³n no disponible', 'error');
      return;
    }

    this.updatingLocation = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const payload = {
          latitud: lat,
          longitud: lon,
          disponible: this.miDisponible,
        };

        this.api.updateMiUbicacion(payload).subscribe({
          next: () => {
            this.ultimaUbicacionActualizada = new Date();
            this.mostrarMensaje('UbicaciÃ³n actualizada âœ“', 'success');
            this.updatingLocation = false;
          },
          error: () => {
            this.mostrarMensaje('Error al actualizar ubicaciÃ³n', 'error');
            this.updatingLocation = false;
          },
        });
      },
      () => {
        this.mostrarMensaje('No se pudo obtener tu ubicaciÃ³n', 'error');
        this.updatingLocation = false;
      },
    );
  }

  abrirModalAsignar(incidente: IncidenteDto): void {
    if (!incidente.latitud || !incidente.longitud) {
      this.mostrarMensaje('El incidente no tiene ubicaciÃ³n', 'error');
      return;
    }

    this.modalIncidentes = incidente;
    this.modalAsignarVisible = true;
    if (!this.servicioSeleccionadoId && this.servicios.length > 0) {
      this.servicioSeleccionadoId = this.servicios[0].id_servicio;
    }
    this.cargarTecnicosCercanos(incidente);
  }

cargarTecnicosCercanos(incidente: IncidenteDto): void {
  // Eliminamos la validación de latitud/longitud porque ya no las necesitamos
  this.cargandoTecnicos = true;

  // Llamamos a la nueva función del servicio que creamos antes
  this.api.listTecnicosDisponibles().subscribe({
    next: (data) => {
        this.tecnicosCercanos = data || [];
      this.cargandoTecnicos = false;
    },
    error: () => {
      this.mostrarMensaje('Error al cargar técnicos disponibles', 'error');
      this.cargandoTecnicos = false;
    },
  });
}

  confirmarAsignacion(tecnico: any): void {
    if (!this.modalIncidentes) return;
    if (!this.servicioSeleccionadoId) {
      this.mostrarMensaje('Selecciona un servicio antes de asignar', 'error');
      return;
    }

    const empleadoId = tecnico.empleado_id || tecnico.id;
    if (!empleadoId) {
      this.mostrarMensaje('No se pudo resolver el empleado a asignar', 'error');
      return;
    }

    this.asignando = true;
    const payload: AsignarTecnicoRequest = {
      empleado_id: empleadoId,
      servicio_id: this.servicioSeleccionadoId || undefined,
    };

    this.api.assignTecnico(this.modalIncidentes.id, payload).subscribe({
      next: () => {
        this.mostrarMensaje(
          `TÃ©cnico ${tecnico.nombre_completo} asignado âœ“`,
          'success',
        );
        this.cerrarModalAsignar();
        this.cargarIncidentes();
        this.asignando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al asignar tÃ©cnico', 'error');
        this.asignando = false;
      },
    });
  }

  aceptarSolicitud(incidente: IncidenteDto): void {
    this.api.acceptIncident(incidente.id).subscribe({
      next: (updated) => {
        this.mostrarMensaje('Solicitud aceptada', 'success');
        this.cargarIncidentes();
        // refresh empresa data to update rating in UI
        this.empresaApi.refreshMyEmpresa().subscribe({ next: () => {}, error: (err: any) => console.error('Error refrescando empresa:', err) });
      },
      error: (err: any) => {
        console.error('Error aceptando incidente:', err);
        this.mostrarMensaje('No se pudo aceptar la solicitud', 'error');
      },
    });
  }

  cancelarAceptacion(incidente: IncidenteDto): void {
    this.api.cancelAcceptance(incidente.id).subscribe({
      next: (updated) => {
        this.mostrarMensaje('Aceptación cancelada', 'success');
        this.cargarIncidentes();
        this.empresaApi.refreshMyEmpresa().subscribe({ next: () => {}, error: (err: any) => console.error('Error refrescando empresa:', err) });
      },
      error: (err: any) => {
        console.error('Error cancelando aceptación:', err);
        this.mostrarMensaje('No se pudo cancelar la aceptación', 'error');
      },
    });
  }

  cerrarModalAsignar(): void {
    this.modalAsignarVisible = false;
    this.modalIncidentes = null;
    this.tecnicosCercanos = [];
  }

  abrirMapa(incidente: IncidenteDto): void {
    if (!incidente.latitud || !incidente.longitud) return;
    const url = `https://maps.google.com/?q=${incidente.latitud},${incidente.longitud}`;
    window.open(url, '_blank');
  }

  verTracking(incidente: IncidenteDto): void {
    // Navegar a la pantalla de tracking
    window.location.href = `/tracking/${incidente.id}`;
  }

  getPriorityColor(prioridad?: number): string {
    if (!prioridad) return '#6b7280';
    if (prioridad <= 2) return '#22c55e'; // Verde - baja
    if (prioridad <= 3) return '#f59e0b'; // Naranja - media
    return '#ef4444'; // Rojo - alta
  }

  private mostrarMensaje(msg: string, tipo: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = tipo;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
}
