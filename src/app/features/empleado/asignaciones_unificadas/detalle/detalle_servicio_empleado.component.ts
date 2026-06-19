import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EmpleadoApiService, MiAsignacionDto } from '../../../../core/servicios/empleados.api.service';
import { IncidenteApiService } from '../../../../core/servicios/incidentes.api.service';
import { AuthService } from '../../../../services/auth/auth.service';

@Component({
  selector: 'app-detalle-servicio-empleado',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="detalle-page">

  <!-- Header -->
  <div class="detalle-header">
    <div>
      <h1 class="detalle-title">Detalle del Servicio</h1>
      <p class="detalle-subtitle">Seguimiento de tu asignación activa</p>
    </div>
    <button class="btn-volver" (click)="volver()">Volver</button>
  </div>

  <!-- Loading -->
  <div class="state-box" *ngIf="loading">
    <div class="spinner"></div>
    <p>Cargando detalles del servicio...</p>
  </div>

  <!-- Error -->
  <div class="state-box error-box" *ngIf="!loading && !asignacion">
    <p class="error-text">{{ errorMensaje || 'No se encontró la asignación.' }}</p>
    <button class="btn-volver" (click)="volver()">Regresar a la lista</button>
  </div>

  <!-- Content -->
  <div class="detalle-content" *ngIf="asignacion && !loading">

    <!-- Fila 1: Incidente | Vehículo -->
    <div class="cards-row">

      <!-- Datos del Incidente -->
      <div class="glass-card">
        <div class="card-header accent-blue">
          <span class="card-label">Datos del Incidente</span>
        </div>
        <div class="card-body">
          <div class="data-row">
            <span class="data-label">Tipo</span>
            <span class="data-value">{{ asignacion.incidente_tipo || 'General' }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Descripción</span>
            <span class="data-value">{{ asignacion.incidente_descripcion || 'Sin información disponible' }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Prioridad</span>
            <span class="data-value">{{ asignacion.prioridad || 'Sin información disponible' }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Fecha</span>
            <span class="data-value">{{ asignacion.fecha_asignacion | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div class="data-row" *ngIf="asignacion.incidente_estado !== 'en_camino' && asignacion.incidente_estado !== 'en_sitio' && asignacion.incidente_estado !== 'en_proceso'">
            <span class="data-label">Estado Incidente</span>
            <span class="badge badge-blue">{{ asignacion.incidente_estado | titlecase }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">{{ (etapaVisual === 'en_camino' || etapaVisual === 'en_sitio') ? 'Etapa' : 'Estado Asignación' }}</span>
            <span class="badge badge-teal">{{ (etapaVisual === 'en_camino' ? 'En camino' : etapaVisual === 'en_sitio' ? 'En sitio' : etapaVisual) | titlecase }}</span>
          </div>
        </div>
      </div>

      <!-- Datos del Vehículo -->
      <div class="glass-card">
        <div class="card-header accent-slate">
          <span class="card-label">Datos del Vehículo</span>
        </div>
        <div class="card-body">
          <ng-container *ngIf="asignacion.vehiculo_marca || asignacion.vehiculo_modelo || asignacion.vehiculo_placa; else sinVehiculo">
            <div class="data-row">
              <span class="data-label">Marca</span>
              <span class="data-value">{{ asignacion.vehiculo_marca || 'Sin información disponible' }}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Modelo</span>
              <span class="data-value">{{ asignacion.vehiculo_modelo || 'Sin información disponible' }}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Año</span>
              <span class="data-value">{{ asignacion.vehiculo_anio || 'Sin información disponible' }}</span>
            </div>
            <div class="data-row">
              <span class="data-label">Placa</span>
              <span class="data-value placa">{{ asignacion.vehiculo_placa || 'N/A' }}</span>
            </div>
          </ng-container>
          <ng-template #sinVehiculo>
            <div class="sin-vehiculo-msg">
              Sin vehículo asociado a este incidente
            </div>
          </ng-template>
        </div>
      </div>

    </div>

    <!-- Fila 2: Técnico | Ubicación -->
    <div class="cards-row">

      <!-- Datos del Técnico -->
      <div class="glass-card">
        <div class="card-header accent-cyan">
          <span class="card-label">Datos del Técnico</span>
        </div>
        <div class="card-body">
          <div class="data-row">
            <span class="data-label">Nombre</span>
            <span class="data-value">{{ tecnicoNombre }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Tu ubicación</span>
            <span class="data-value">
              {{ tecnicoLat != null ? ((tecnicoLat | number:'1.4-4') + ', ' + (tecnicoLon | number:'1.4-4')) : 'Sin ubicación registrada' }}
            </span>
          </div>
          <div class="data-row">
            <span class="data-label">Distancia al cliente</span>
            <span class="data-value">{{ formatDistancia(distanciaKm) }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Tiempo estimado (ETA)</span>
            <span class="data-value">{{ etaMinutos != null ? formatEta(etaMinutos) : 'Calculando...' }}</span>
          </div>
          <div class="data-row" style="margin-top: 6px; justify-content: center;" *ngIf="trackingActivo">
            <span class="badge badge-green">Activo — enviando ubicación</span>
          </div>
        </div>
      </div>

      <!-- Ubicación del Cliente -->
      <div class="glass-card">
        <div class="card-header accent-blue">
          <span class="card-label">Ubicación del Cliente</span>
        </div>
        <div class="card-body">
          <div class="data-row">
            <span class="data-label">Coordenadas</span>
            <span class="data-value">
              {{ asignacion.incidente_latitud != null ? ((asignacion.incidente_latitud | number:'1.4-4') + ', ' + (asignacion.incidente_longitud | number:'1.4-4')) : 'No disponible' }}
            </span>
          </div>
          <div class="maps-btn-wrap">
            <button
              class="btn-maps"
              (click)="abrirGoogleMaps()"
              [disabled]="!asignacion.incidente_latitud || !asignacion.incidente_longitud">
              Abrir en Google Maps
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Fila 3: Acciones -->
    <div class="glass-card actions-card">
      <div class="card-header accent-blue">
        <span class="card-label">Acciones del Servicio</span>
      </div>
      <div class="card-body actions-body">

        <ng-container *ngIf="asignacion.estado_tarea === 'aceptada'">
          <button
            class="btn-accion btn-primary-accion"
            [disabled]="accionLoading || etapaVisual !== 'aceptada'"
            (click)="iniciarRecorrido()">
            {{ (accionLoading && etapaVisual === 'aceptada') ? 'Procesando...' : 'Iniciar recorrido' }}
          </button>

          <button
            class="btn-accion btn-primary-accion"
            [disabled]="accionLoading || etapaVisual !== 'en_camino'"
            (click)="llegarAlSitio()">
            {{ (accionLoading && etapaVisual === 'en_camino') ? 'Procesando...' : 'Llegué al sitio' }}
          </button>

          <button
            class="btn-accion btn-success-accion"
            [disabled]="accionLoading || etapaVisual !== 'en_sitio'"
            (click)="finalizarServicio()">
            {{ (accionLoading && etapaVisual === 'en_sitio') ? 'Procesando...' : 'Finalizar servicio' }}
          </button>
        </ng-container>

        <div class="accion-msg" *ngIf="accionMensaje">{{ accionMensaje }}</div>

        <div class="estado-final" *ngIf="etapaVisual === 'finalizada' || etapaVisual === 'finalizado' || etapaVisual === 'atendido' || asignacion.estado_tarea === 'finalizado' || asignacion.estado_tarea === 'atendido'">
          Servicio finalizado
        </div>

      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
    /* ── Page shell ── */
    .detalle-page {
      min-height: 100vh;
      background: transparent;
      padding: 32px 24px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    /* ── Header ── */
    .detalle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    .detalle-title {
      margin: 0 0 4px;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text, #10212f);
      letter-spacing: -0.3px;
    }
    .detalle-subtitle {
      margin: 0;
      font-size: 0.9rem;
      color: var(--muted, #506070);
    }
    .btn-volver {
      background: var(--surface, #ffffff);
      border: 1px solid var(--line, #d5dde5);
      color: var(--text, #10212f);
      padding: 9px 20px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: background 0.2s, border-color 0.2s;
    }
    .btn-volver:hover { background: var(--surface-2, #e9eef2); border-color: rgba(0,0,0,0.15); }

    /* ── State boxes (loading / error) ── */
    .state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 60px 24px;
      color: var(--muted, #506070);
    }
    .error-box { color: var(--danger, #b42318); }
    .error-text { font-size: 1rem; text-align: center; }
    .spinner {
      width: 42px; height: 42px;
      border: 4px solid var(--line, #d5dde5);
      border-top-color: var(--brand, #0c7b93);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Layout grid ── */
    .detalle-content { display: flex; flex-direction: column; gap: 20px; }
    .cards-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    /* ── Glass card ── */
    .glass-card {
      background: rgba(255, 255, 255, 0.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .glass-card:hover {
      box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08);
      transform: translateY(-2px);
    }

    /* ── Card header accents ── */
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    }
    .accent-blue   { background: rgba(12, 123, 147, 0.08); }
    .accent-slate  { background: rgba(80, 96, 112, 0.06); }
    .accent-cyan   { background: rgba(15, 123, 108, 0.06); }
    .card-label {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--brand-2, #144f6a);
    }

    /* ── Card body ── */
    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .data-label {
      font-size: 0.82rem;
      color: var(--muted, #506070);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .data-value {
      font-size: 0.9rem;
      color: var(--text, #10212f);
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }
    .data-value.placa {
      font-family: 'Courier New', monospace;
      background: rgba(12, 123, 147, 0.08);
      color: var(--brand-2, #144f6a);
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid rgba(12, 123, 147, 0.15);
      letter-spacing: 0.05em;
    }
    .sin-vehiculo-msg {
      text-align: center;
      font-size: 0.9rem;
      color: var(--muted, #506070);
      padding: 20px 10px;
      font-style: italic;
    }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    .badge-blue  { background: rgba(12, 123, 147, 0.12); color: var(--brand, #0c7b93); border: 1px solid rgba(12, 123, 147, 0.2); }
    .badge-teal  { background: rgba(15, 123, 108, 0.12); color: var(--ok, #0f7b6c); border: 1px solid rgba(15, 123, 108, 0.2); }
    .badge-green { background: rgba(34, 197, 94, 0.12);  color: #166534; border: 1px solid rgba(34, 197, 94, 0.2); }

    /* ── Maps button ── */
    .maps-btn-wrap { margin-top: 8px; text-align: right; }
    .btn-maps {
      background: rgba(12, 123, 147, 0.1);
      border: 1px solid rgba(12, 123, 147, 0.25);
      color: var(--brand, #0c7b93);
      padding: 8px 18px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-maps:hover:not(:disabled) { background: rgba(12, 123, 147, 0.18); }
    .btn-maps:disabled { opacity: 0.4; cursor: default; }

    /* ── Actions card ── */
    .actions-card { width: 100%; }
    .actions-body {
      flex-direction: row !important;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 16px !important;
      padding: 24px !important;
    }
    .btn-accion {
      padding: 12px 32px;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: transform 0.15s, opacity 0.2s;
      letter-spacing: 0.02em;
    }
    .btn-accion:disabled { opacity: 0.5; cursor: default; transform: none !important; }
    .btn-accion:not(:disabled):hover { transform: translateY(-2px); }
    .btn-primary-accion {
      background: linear-gradient(130deg, var(--brand, #0c7b93), var(--brand-2, #144f6a));
      color: #fff;
      box-shadow: 0 4px 14px rgba(12, 123, 147, 0.3);
    }
    .btn-success-accion {
      background: linear-gradient(135deg, #0f7b6c, #148f7d);
      color: #fff;
      box-shadow: 0 4px 14px rgba(15, 123, 108, 0.3);
    }
    .accion-msg {
      width: 100%;
      text-align: center;
      font-size: 0.85rem;
      color: var(--ok, #0f7b6c);
      margin-top: 4px;
    }
    .estado-final {
      font-size: 1rem;
      color: var(--ok, #0f7b6c);
      font-weight: 600;
      text-align: center;
    }
  `]
})
export class DetalleServicioEmpleadoComponent implements OnInit, OnDestroy {
  asignacion: MiAsignacionDto | null = null;
  loading = true;
  errorMensaje: string | null = null;
  etapaVisual: 'asignada' | 'aceptada' | 'en_camino' | 'en_sitio' | 'finalizada' | 'atendido' | 'finalizado' | 'cancelada' | 'pendiente' = 'asignada';

  tecnicoNombre = '';
  tecnicoLat: number | null = null;
  tecnicoLon: number | null = null;
  distanciaKm: number | null = null;
  etaMinutos: number | null = null;

  accionLoading = false;
  accionMensaje = '';
  trackingActivo = false;

  private incidenteId: string | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private empleadoApi: EmpleadoApiService,
    private incidenteApi: IncidenteApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser as any;
    this.tecnicoNombre = user?.first_name
      ? `${user.first_name} ${user.last_name ?? ''}`.trim()
      : user?.username || 'Técnico';

    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID recibido:', id);
    if (!id) {
      this.errorMensaje = 'No se proporcionó un ID válido en la URL.';
      this.loading = false;
      return;
    }
    this.incidenteId = id;

    this.empleadoApi.getMe().subscribe({
      next: (emp) => {
        if (emp.latitud_actual != null && emp.longitud_actual != null) {
          this.tecnicoLat = Number(emp.latitud_actual);
          this.tecnicoLon = Number(emp.longitud_actual);
          this.calcularDistancia();
        }
      },
      error: (err) => console.error('Error al obtener perfil del técnico:', err)
    });

    this.empleadoApi.getMyAsignaciones().subscribe({
      next: (asignaciones) => {
        console.log('Respuesta backend:', asignaciones);
        this.asignacion = asignaciones.find(a => String(a.incidente_id) === String(id)) || null;
        if (!this.asignacion) {
          this.errorMensaje = 'No se encontró la asignación solicitada en tu lista actual.';
        } else {
          // Utilizar ubicación del técnico provista por la asignación si existe
          if (this.asignacion.latitud_actual != null && this.asignacion.longitud_actual != null) {
            this.tecnicoLat = Number(this.asignacion.latitud_actual);
            this.tecnicoLon = Number(this.asignacion.longitud_actual);
          }
          this.calcularDistancia();
          
          // Determinar etapa_visual inicial
          const savedStage = sessionStorage.getItem('etapa_visual_incidente_' + id);
          const backendState = this.asignacion.estado_tarea;

          if (backendState === 'finalizado' || backendState === 'atendido') {
            this.etapaVisual = 'finalizada';
            sessionStorage.removeItem('etapa_visual_incidente_' + id);
          } else if (backendState === 'cancelado' || backendState === 'cancelada') {
            this.etapaVisual = 'cancelada';
            sessionStorage.removeItem('etapa_visual_incidente_' + id);
          } else if (savedStage && ['en_camino', 'en_sitio'].includes(savedStage) && backendState === 'aceptada') {
            this.etapaVisual = savedStage as any;
          } else {
            this.etapaVisual = backendState as any;
          }

          // Iniciar tracking si está en camino o en sitio
          if (['en_camino', 'en_sitio'].includes(this.etapaVisual)) {
            this.iniciarTracking();
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.log('Error detalle:', error);
        const status = error?.status;
        if (status === 404) this.errorMensaje = 'El servidor no encontró el recurso.';
        else if (status === 403) this.errorMensaje = 'No tienes permiso para ver esta asignación.';
        else if (status >= 500) this.errorMensaje = 'Error en el servidor. Intenta de nuevo.';
        else this.errorMensaje = error?.error?.detail || 'No se pudo cargar la información.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy() {
    this.detenerTracking();
  }

  volver() {
    this.router.navigate(['/app/empleado/asignaciones', 'curso']);
  }

  abrirGoogleMaps() {
    if (this.asignacion?.incidente_latitud && this.asignacion?.incidente_longitud) {
      const url = `https://www.google.com/maps?q=${this.asignacion.incidente_latitud},${this.asignacion.incidente_longitud}`;
      window.open(url, '_blank');
    }
  }

  iniciarRecorrido() {
    if (!this.incidenteId) return;
    console.log('[frontend] iniciar recorrido clickeado para incidente:', this.incidenteId);
    
    this.etapaVisual = 'en_camino';
    sessionStorage.setItem('etapa_visual_incidente_' + this.incidenteId, 'en_camino');
    this.accionMensaje = 'Recorrido iniciado. Compartiendo ubicación.';
    this.iniciarTracking();
    this.empleadoApi.invalidarCacheAsignaciones();
  }

  llegarAlSitio() {
    if (!this.incidenteId || this.accionLoading) return;
    this.accionLoading = true;
    this.accionMensaje = '';
    this.incidenteApi.updateEstado(this.incidenteId, { estado: 'en_sitio' }).subscribe({
      next: () => {
        this.etapaVisual = 'en_sitio';
        sessionStorage.setItem('etapa_visual_incidente_' + this.incidenteId, 'en_sitio');
        this.accionMensaje = 'Has llegado al sitio.';
        this.accionLoading = false;
        this.empleadoApi.invalidarCacheAsignaciones();
      },
      error: (err) => {
        this.accionMensaje = err?.error?.detail || 'No se pudo actualizar el estado.';
        this.accionLoading = false;
      }
    });
  }

  finalizarServicio() {
    if (!this.incidenteId || this.accionLoading) return;
    this.accionLoading = true;
    this.accionMensaje = '';
    this.incidenteApi.updateEstado(this.incidenteId, { estado: 'atendido' }).subscribe({
      next: () => {
        if (this.asignacion) this.asignacion.estado_tarea = 'finalizado';
        this.etapaVisual = 'finalizada';
        sessionStorage.removeItem('etapa_visual_incidente_' + this.incidenteId!);
        this.accionMensaje = 'Servicio finalizado correctamente. Redirigiendo al historial...';
        this.accionLoading = false;
        this.detenerTracking();
        this.empleadoApi.invalidarCacheAsignaciones();
        setTimeout(() => {
          this.router.navigate(['/app/empleado/asignaciones/historial']);
        }, 1500);
      },
      error: (err) => {
        this.accionMensaje = err?.error?.detail || 'No se pudo finalizar el servicio.';
        this.accionLoading = false;
      }
    });
  }

  private iniciarTracking() {
    if (this.trackingActivo) return;
    this.trackingActivo = true;
    this.enviarUbicacion(); // send immediately
    this.trackingInterval = setInterval(() => this.enviarUbicacion(), 10_000);
  }

  private detenerTracking() {
    this.trackingActivo = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  private enviarUbicacion() {
    if (!this.incidenteId) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        this.tecnicoLat = lat;
        this.tecnicoLon = lon;
        this.calcularDistancia();
        console.log('[frontend] ubicación enviada:', lat, lon);
        // Use the per-incident endpoint so WS broadcast updates admin tracking map
        this.incidenteApi.updateUbicacionTecnicoIncidente(this.incidenteId!, { latitud: lat, longitud: lon }).subscribe({
          error: (e) => console.warn('Error enviando ubicación:', e)
        });
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  private calcularDistancia() {
    if (
      this.tecnicoLat != null && this.tecnicoLon != null &&
      this.asignacion?.incidente_latitud && this.asignacion?.incidente_longitud
    ) {
      const dist = this.haversine(
        this.tecnicoLat, this.tecnicoLon,
        this.asignacion.incidente_latitud, this.asignacion.incidente_longitud
      );
      this.distanciaKm = Math.round(dist * 100) / 100;
      this.etaMinutos = Math.round(this.distanciaKm * 2);
    }
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  formatDistancia(km: number | null): string {
    if (km == null) return 'Calculando...';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(2)} km`;
  }

  formatEta(minutos: number): string {
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
}
