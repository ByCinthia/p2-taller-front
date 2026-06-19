import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { EmpleadoApiService, MiAsignacionDto } from '../../../core/servicios/empleados.api.service';
import { IncidenteApiService } from '../../../core/servicios/incidentes.api.service';

/** Timeout en ms para considerar la carga como fallida */
const LOAD_TIMEOUT_MS = 10_000;

@Component({
  selector: 'app-empleado-asignaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empleado-asignaciones.component.html',
  styleUrls: ['./empleado-asignaciones.component.css'],
})
export class EmpleadoAsignacionesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  tipoFiltro: string = 'asignadas';

  todasAsignaciones: MiAsignacionDto[] = [];
  asignacionesFiltradas: MiAsignacionDto[] = [];

  loading = false;
  errorMsg = '';

  /** IDs de incidentes con acción en curso (para deshabilitar botones) */
  procesando = new Set<string>();

  /** Mensajes de éxito por incidente_id */
  mensajeExito: Record<string, string> = {};

  /** Mensajes de error por incidente_id */
  mensajeError: Record<string, string> = {};

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly empleadoApi: EmpleadoApiService,
    private readonly incidenteApi: IncidenteApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Suscribirse a cambios de parámetro de ruta (tabs: asignadas / curso / historial).
    // Solo llama al backend la primera vez; las siguientes navegaciones usan el caché.
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.tipoFiltro = params.get('tipoFiltro') || 'asignadas';

        if (this.todasAsignaciones.length > 0) {
          // Ya tenemos datos en memoria → solo re-filtrar, sin petición HTTP
          this.aplicarFiltro();
        } else {
          this.cargarDatos();
        }
      });
  }

  get tituloHeader(): string {
    if (this.tipoFiltro === 'curso') return 'Servicios en Curso';
    if (this.tipoFiltro === 'historial') return 'Historial de servicios finalizados';
    return 'Mis asignaciones';
  }

  get descripcionHeader(): string {
    if (this.tipoFiltro === 'curso') return 'Solicitudes que estás atendiendo actualmente.';
    if (this.tipoFiltro === 'historial') return 'Servicios completados o cancelados';
    return 'Nuevas solicitudes pendientes de atención.';
  }

  cargarDatos(forzarRecarga = false): void {
    if (this.loading) {
      console.log('[AsignacionesComponent] Ya hay una carga en curso, ignorando llamada duplicada.');
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    if (forzarRecarga) {
      this.mensajeExito = {};
      this.mensajeError = {};
    }

    console.time('cargarAsignaciones');

    this.empleadoApi
      .getMyAsignaciones(forzarRecarga)
      .pipe(
        timeout(LOAD_TIMEOUT_MS),
        catchError(err => {
          const esTimeout = err?.name === 'TimeoutError';
          this.errorMsg = esTimeout
            ? 'La carga tardó demasiado (>10s). Verifica tu conexión y reintenta.'
            : err?.error?.detail || err?.message || 'Error al cargar las asignaciones.';
          console.error('[AsignacionesComponent] Error al cargar:', err);
          console.timeEnd('cargarAsignaciones');
          this.loading = false;
          this.cdr.detectChanges(); // forzar re-render tras error
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          // catchError ya puso loading=false y errorMsg en caso de error,
          // y retornó of([]). Si errorMsg está seteado, no sobreescribir estado.
          if (this.errorMsg) {
            console.log('[AsignacionesComponent] next() ignorado (vino tras catchError)');
            console.log('loading=', this.loading);
            return;
          }

          this.todasAsignaciones = (data ?? []).sort(
            (a, b) => new Date(b.fecha_asignacion).getTime() - new Date(a.fecha_asignacion).getTime()
          );
          this.aplicarFiltro();
          this.loading = false;
          this.cdr.detectChanges(); // forzar re-render (shareReplay emite sincrónicamente)
          console.timeEnd('cargarAsignaciones');
          console.log('loading=', this.loading);
          console.log('asignacionesFiltradas=', this.asignacionesFiltradas.length);
          console.log(`[AsignacionesComponent] ${this.todasAsignaciones.length} cargadas, ${this.asignacionesFiltradas.length} visibles (filtro: ${this.tipoFiltro})`);
        },
      });
  }

  aplicarFiltro(): void {
    this.asignacionesFiltradas = this.todasAsignaciones.filter(item => {
      const estadoIncidente = (item.incidente_estado || '').toLowerCase();
      const estadoTarea = (item.estado_tarea || '').toLowerCase();

      const activeStates = ['aceptada', 'asignada', 'pendiente', 'en_camino', 'en_proceso', 'en_sitio'];
      const finalStates = ['finalizado', 'finalizada', 'atendido', 'atendida', 'completado', 'completada', 'cancelado', 'cancelada', 'rechazada'];

      const esTareaActiva = activeStates.includes(estadoTarea);
      const esTareaFinal = finalStates.includes(estadoTarea);

      const esHistorial = esTareaFinal && !esTareaActiva;

      const esCurso = !esHistorial && ['aceptada', 'en_camino', 'en_proceso', 'en_sitio'].includes(estadoTarea);

      if (this.tipoFiltro === 'curso') {
        return esCurso;
      } else if (this.tipoFiltro === 'historial') {
        return esHistorial;
      } else {
        // Por defecto 'asignadas' (Mis asignaciones)
        return ['asignada', 'pendiente'].includes(estadoTarea) && !esHistorial && !esCurso;
      }
    });
  }

  formatEta(minutos: number | null | undefined): string {
    if (minutos == null || minutos === 0) return 'N/A';
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  /**
   * Devuelve true si la asignación puede ser aceptada o rechazada.
   * Condición: estado_tarea es 'asignada' Y el incidente está 'pendiente' o 'aceptada'.
   */
  esPendienteAceptar(item: MiAsignacionDto): boolean {
    const tarea = (item.estado_tarea || '').toLowerCase();
    const incidente = (item.incidente_estado || '').toLowerCase();
    return tarea === 'asignada' && ['pendiente', 'aceptada'].includes(incidente);
  }

  aceptar(item: MiAsignacionDto): void {
    if (this.procesando.has(item.incidente_id)) return;
    this.procesando.add(item.incidente_id);
    delete this.mensajeExito[item.incidente_id];
    delete this.mensajeError[item.incidente_id];

    this.incidenteApi.acceptIncident(item.incidente_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesando.delete(item.incidente_id);
          this.mensajeExito[item.incidente_id] = '✓ Solicitud aceptada. El cliente fue notificado.';
          // Invalidar caché y refrescar lista
          this.empleadoApi.invalidarCacheAsignaciones();
          setTimeout(() => this.cargarDatos(true), 1500);
        },
        error: (err) => {
          this.procesando.delete(item.incidente_id);
          this.mensajeError[item.incidente_id] =
            err?.error?.detail || 'Error al aceptar la solicitud. Intenta nuevamente.';
        }
      });
  }

  rechazar(item: MiAsignacionDto): void {
    if (this.procesando.has(item.incidente_id)) return;
    this.procesando.add(item.incidente_id);
    delete this.mensajeExito[item.incidente_id];
    delete this.mensajeError[item.incidente_id];

    this.incidenteApi.cancelAcceptance(item.incidente_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesando.delete(item.incidente_id);
          this.mensajeExito[item.incidente_id] = '✓ Solicitud rechazada.';
          this.empleadoApi.invalidarCacheAsignaciones();
          setTimeout(() => this.cargarDatos(true), 1500);
        },
        error: (err) => {
          this.procesando.delete(item.incidente_id);
          this.mensajeError[item.incidente_id] =
            err?.error?.detail || 'Error al rechazar la solicitud. Intenta nuevamente.';
        }
      });
  }

  esEstadoFinalizado(item: MiAsignacionDto): boolean {
    const tarea = (item.estado_tarea || '').toLowerCase();
    const incidente = (item.incidente_estado || '').toLowerCase();
    const estadosOcultar = ['finalizado', 'finalizada', 'atendido', 'atendida', 'cancelado', 'cancelada'];
    return estadosOcultar.includes(tarea) || estadosOcultar.includes(incidente);
  }

  verDetalle(item: MiAsignacionDto): void {
    this.router.navigate(['/app/empleado/asignaciones/detalle', item.incidente_id]);
  }
}
