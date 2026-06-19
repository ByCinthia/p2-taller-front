import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  IncidenteApiService,
  IncidenteDto,
  IncidenteTrackingDto,
} from '../../../core/servicios/incidentes.api.service';

@Component({
  selector: 'app-tracking-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="tracking-page">

  <!-- Header -->
  <div class="tracking-header">
    <div class="header-left">
      <button class="btn-back" (click)="volver()">
        <span class="back-icon">←</span> Volver
      </button>
      <div>
        <h1 class="page-title">Tracking del servicio</h1>
        <p class="page-subtitle" *ngIf="incidente">
          Incidente #{{ incidente.id.slice(0, 8) }}...
          <span class="badge-estado" [class]="'estado-' + incidente.estado">{{ incidente.estado }}</span>
        </p>
      </div>
    </div>
    <div class="header-right">
      <div class="ws-indicator" [class.connected]="wsConectado">
        <span class="ws-dot"></span>
        {{ wsConectado ? 'En vivo' : 'Desconectado' }}
      </div>
      <button class="btn-refresh" (click)="refrescarTracking()" [disabled]="cargando">
        ⟳ Refrescar
      </button>
    </div>
  </div>

  <!-- Loading -->
  <div class="state-box" *ngIf="cargando">
    <div class="spinner"></div>
    <p>Cargando información de tracking...</p>
  </div>

  <!-- Error (solo si no hay WS activo) -->
  <div class="state-box error-box" *ngIf="!cargando && error && !wsConectado">
    <p class="error-text">{{ error }}</p>
    <button class="btn-back" (click)="volver()">Regresar</button>
  </div>

  <!-- Main content -->
  <div class="tracking-content" *ngIf="tracking && !cargando">

    <!-- Info cards row -->
    <div class="info-row">

      <!-- Incidente card -->
      <div class="glass-card">
        <div class="card-header accent-blue">
          <span class="card-label">📋 Incidente</span>
        </div>
        <div class="card-body">
          <div class="data-row" *ngIf="incidente?.tipo">
            <span class="data-label">Tipo</span>
            <span class="data-value">{{ incidente!.tipo }}</span>
          </div>
          <div class="data-row" *ngIf="incidente?.descripcion">
            <span class="data-label">Descripción</span>
            <span class="data-value desc">{{ incidente!.descripcion }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Estado</span>
            <span class="badge-estado" [class]="'estado-' + (tracking.estado || incidente?.estado)">
              {{ estadoLabel(tracking.estado) }}
            </span>
          </div>
          <div class="data-row" *ngIf="incidente?.prioridad">
            <span class="data-label">Prioridad</span>
            <span class="data-value">{{ incidente!.prioridad }}</span>
          </div>
          <div class="data-row" *ngIf="tracking.latitud_incidente">
            <span class="data-label">Ubicación</span>
            <span class="data-value coords">
              {{ tracking.latitud_incidente | number:'1.4-4' }},
              {{ tracking.longitud_incidente | number:'1.4-4' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Técnico card -->
      <div class="glass-card">
        <div class="card-header accent-cyan">
          <span class="card-label">👷 Técnico asignado</span>
        </div>
        <div class="card-body">
          <div class="data-row">
            <span class="data-label">Nombre</span>
            <span class="data-value">{{ tracking.tecnico_nombre || 'Sin asignar' }}</span>
          </div>
          <div class="data-row" *ngIf="tracking.tecnico_latitud">
            <span class="data-label">Posición</span>
            <span class="data-value coords">
              {{ tracking.tecnico_latitud | number:'1.4-4' }},
              {{ tracking.tecnico_longitud | number:'1.4-4' }}
            </span>
          </div>
          <div class="data-row" *ngIf="!tracking.tecnico_latitud">
            <span class="data-label">Posición</span>
            <span class="data-value muted">Esperando ubicación del técnico...</span>
          </div>
          <div class="data-row" *ngIf="tracking.tecnico_ubicacion_actualizada_en">
            <span class="data-label">Última actualización</span>
            <span class="data-value">{{ tracking.tecnico_ubicacion_actualizada_en | date:'HH:mm:ss' }}</span>
          </div>
        </div>
      </div>

      <!-- Ruta card -->
      <div class="glass-card">
        <div class="card-header accent-green">
          <span class="card-label">🛣️ Ruta estimada</span>
        </div>
        <div class="card-body">
          <div class="data-row">
            <span class="data-label">Distancia restante</span>
            <span class="data-value highlight">{{ formatDistancia(tracking.distancia_km) }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">ETA</span>
            <span class="data-value highlight">{{ formatEta(tracking.eta_minutos) }}</span>
          </div>
          <div class="etapa-visual" *ngIf="tracking.estado">
            <div class="etapa-step" [class.active]="isEtapaActive('aceptada')" [class.done]="isEtapaDone('aceptada')">
              <span class="etapa-dot"></span><span class="etapa-name">Aceptada</span>
            </div>
            <div class="etapa-line"></div>
            <div class="etapa-step" [class.active]="isEtapaActive('en_camino')" [class.done]="isEtapaDone('en_camino')">
              <span class="etapa-dot"></span><span class="etapa-name">En camino</span>
            </div>
            <div class="etapa-line"></div>
            <div class="etapa-step" [class.active]="isEtapaActive('en_sitio')" [class.done]="isEtapaDone('en_sitio')">
              <span class="etapa-dot"></span><span class="etapa-name">En sitio</span>
            </div>
            <div class="etapa-line"></div>
            <div class="etapa-step" [class.active]="isEtapaActive('atendido')" [class.done]="isEtapaDone('atendido')">
              <span class="etapa-dot"></span><span class="etapa-name">Finalizado</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Map -->
    <div class="map-section">
      <div class="map-header">
        <span class="card-label">🗺️ Mapa en tiempo real</span>
        <span class="muted" *ngIf="!tracking.tecnico_latitud">Esperando ubicación del técnico...</span>
        <span class="pulse-dot" *ngIf="tracking.tecnico_latitud"></span>
      </div>
      <div #trackingMap class="map-canvas"></div>
    </div>

  </div>

</div>
  `,
  styles: [`
    /* ── Page ── */
    .tracking-page {
      min-height: 100vh;
      padding: 28px 24px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: transparent;
    }

    /* ── Header ── */
    .tracking-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .header-right { display: flex; align-items: center; gap: 12px; }

    .btn-back {
      display: flex; align-items: center; gap: 6px;
      background: var(--surface, #ffffff);
      border: 1px solid var(--line, #d5dde5);
      color: var(--text, #10212f);
      padding: 9px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: background 0.2s, border-color 0.2s;
      white-space: nowrap;
    }
    .btn-back:hover { background: var(--surface-2, #e9eef2); border-color: rgba(0,0,0,0.15); }

    .page-title {
      margin: 0 0 4px;
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text, #10212f);
      letter-spacing: -0.3px;
    }
    .page-subtitle {
      margin: 0;
      font-size: 1rem;
      color: var(--muted, #506070);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ws-indicator {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--muted, #506070);
      background: rgba(255,255,255,0.45);
      border: 1px solid rgba(255, 255, 255, 0.6);
      padding: 6px 12px;
      border-radius: 20px;
    }
    .ws-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      transition: background 0.3s;
    }
    .ws-indicator.connected { color: #0f7b6c; border-color: rgba(15, 123, 108, 0.2); background: rgba(15, 123, 108, 0.08); }
    .ws-indicator.connected .ws-dot { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.5); animation: pulse-ws 1.5s infinite; }
    @keyframes pulse-ws { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .btn-refresh {
      background: rgba(12, 123, 147, 0.1);
      border: 1px solid rgba(12, 123, 147, 0.25);
      color: var(--brand, #0c7b93);
      padding: 8px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-refresh:hover:not(:disabled) { background: rgba(12, 123, 147, 0.18); }
    .btn-refresh:disabled { opacity: 0.4; cursor: default; }

    /* ── State boxes ── */
    .state-box {
      display: flex; flex-direction: column; align-items: center;
      gap: 16px; padding: 80px 24px;
      color: var(--muted, #506070);
    }
    .error-box { color: var(--danger, #b42318); }
    .error-text { font-size: 1rem; text-align: center; }
    .spinner {
      width: 44px; height: 44px;
      border: 4px solid var(--line, #d5dde5);
      border-top-color: var(--brand, #0c7b93);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Layout ── */
    .tracking-content { display: flex; flex-direction: column; gap: 20px; }

    .info-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    /* ── Glass card ── */
    .glass-card {
      background: rgba(255, 255, 255, 0.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .glass-card:hover {
      box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08);
      transform: translateY(-2px);
    }

    .card-header {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    }
    .accent-blue  { background: rgba(12, 123, 147, 0.08); }
    .accent-cyan  { background: rgba(15, 123, 108, 0.06); }
    .accent-green { background: rgba(34, 197, 94, 0.08); }

    .card-label {
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--brand-2, #144f6a);
    }

    .card-body {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .data-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .data-label {
      font-size: 0.95rem;
      color: var(--muted, #506070);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .data-value {
      font-size: 1.05rem;
      color: var(--text, #10212f);
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }
    .data-value.desc { font-size: 1rem; font-weight: 400; color: #506070; }
    .data-value.coords { font-family: 'Courier New', monospace; font-size: 0.9rem; }
    .data-value.muted { color: #506070; font-weight: 400; font-style: italic; }
    .data-value.highlight { color: var(--brand, #0c7b93); font-size: 1.2rem; font-weight: 700; }

    /* ── Estado badge ── */
    .badge-estado {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      border: 1px solid;
    }
    .estado-pendiente  { background: rgba(250,204,21,0.12);  color: #b45309; border-color: rgba(251,191,36,0.3); }
    .estado-aceptada   { background: rgba(12,123,147,0.12);   color: #0c7b93; border-color: rgba(12,123,147,0.2); }
    .estado-asignada   { background: rgba(139,92,246,0.1);   color: #6d28d9; border-color: rgba(139,92,246,0.3); }
    .estado-en_camino  { background: rgba(251,146,60,0.12);  color: #c2410c; border-color: rgba(251,146,60,0.3); }
    .estado-en_sitio   { background: rgba(15,123,108,0.12);   color: #0f7b6c; border-color: rgba(15,123,108,0.2); }
    .estado-atendido,
    .estado-completada { background: rgba(34,197,94,0.12);   color: #166534; border-color: rgba(34,197,94,0.2); }
    .estado-cancelada  { background: rgba(248,113,113,0.1);  color: #b42318; border-color: rgba(248,113,113,0.3); }

    /* ── Etapa visual timeline ── */
    .etapa-visual {
      display: flex;
      align-items: center;
      margin-top: 8px;
      flex-wrap: wrap;
      gap: 0;
    }
    .etapa-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex: 0 0 auto;
    }
    .etapa-dot {
      width: 12px; height: 12px;
      border-radius: 50%;
      border: 2px solid var(--line, #d5dde5);
      background: #ffffff;
      transition: all 0.3s;
    }
    .etapa-name {
      font-size: 0.82rem;
      color: var(--muted, #506070);
      white-space: nowrap;
      font-weight: 500;
    }
    .etapa-step.active .etapa-dot { border-color: var(--brand, #0c7b93); background: var(--brand, #0c7b93); box-shadow: 0 0 8px rgba(12,123,147,0.4); }
    .etapa-step.active .etapa-name { color: var(--brand, #0c7b93); font-weight: 700; }
    .etapa-step.done .etapa-dot { border-color: var(--ok, #0f7b6c); background: var(--ok, #0f7b6c); }
    .etapa-step.done .etapa-name { color: var(--ok, #0f7b6c); }
    .etapa-line {
      flex: 1;
      height: 2px;
      background: var(--line, #d5dde5);
      min-width: 12px;
      max-width: 32px;
      margin-bottom: 16px;
    }

    /* ── Map section ── */
    .map-section {
      background: rgba(255, 255, 255, 0.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
      transition: box-shadow 0.2s;
    }
    .map-section:hover {
      box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08);
    }
    .map-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    }
    .map-header .muted { color: var(--muted, #506070); font-size: 1rem; font-style: italic; }
    .pulse-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px rgba(16,185,129,0.6);
      animation: pulse-ws 1.2s infinite;
    }
    .map-canvas {
      width: 100%;
      height: 460px;
      z-index: 1;
    }

    @media (max-width: 768px) {
      .tracking-header { flex-direction: column; align-items: flex-start; }
      .map-canvas { height: 340px; }
      .info-row { grid-template-columns: 1fr; }
    }
  `],
})
export class TrackingAdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trackingMap') mapElement?: ElementRef<HTMLDivElement>;

  private L: any;
  private map: any;
  private incidentMarker: any;
  private techMarker: any;
  private routePolyline: any;

  private ws: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  incidenteId = '';
  incidente: IncidenteDto | null = null;
  tracking: IncidenteTrackingDto | null = null;
  cargando = true;
  error: string | null = null;
  wsConectado = false;

  private readonly ETAPAS = ['aceptada', 'en_camino', 'en_sitio', 'atendido'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: IncidenteApiService,
  ) { }

  ngOnInit(): void {
    this.incidenteId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.incidenteId) {
      this.error = 'No se proporcionó un ID de incidente válido.';
      this.cargando = false;
      return;
    }
    this.cargarDatos();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initLeaflet();
    // El mapa se inicializará después de que lleguen los datos
  }

  ngOnDestroy(): void {
    this.desconectarWS();
    if (this.map) {
      try { this.map.remove(); } catch { /* ignore */ }
    }
  }

  // ── Datos ──────────────────────────────────────────────────

  private cargarDatos(): void {
    this.cargando = true;

    // Cargar datos básicos del incidente en paralelo (opcional)
    this.api.get(this.incidenteId).subscribe({
      next: (inc) => { this.incidente = inc; },
      error: () => { /* datos básicos opcionales */ },
    });

    // Cargar tracking inicial (contiene toda la info necesaria)
    this.api.getTracking(this.incidenteId).subscribe({
      next: (t) => {
        this.tracking = t;
        this.cargando = false;
        setTimeout(() => {
          this.initMap();
          this.actualizarMapa();
        }, 0);
        // WS se conecta siempre, independientemente del HTTP
        this.conectarWS();
      },
      error: () => {
        // Si el HTTP falla, NO bloqueamos la pantalla: el WS puede
        // traer datos. Creamos un tracking vacío para que el template
        // muestre el mapa y el WS lo rellene cuando lleguen mensajes.
        console.warn('[TRACKING ADMIN] HTTP tracking falló, esperando datos del WS...');
        this.tracking = {
          incidente_id: this.incidenteId,
          estado: '',
        } as any;
        this.error = null;          // limpiar error; el WS podría funcionar
        // cargando queda en true hasta que llegue el primer mensaje WS válido
        this.conectarWS();
      },
    });
  }

  refrescarTracking(): void {
    this.api.getTracking(this.incidenteId).subscribe({
      next: (t) => {
        this.tracking = t;
        this.actualizarMapa();
      },
      error: () => { this.error = 'No se pudo refrescar el tracking.'; },
    });
  }

  // ── Leaflet ────────────────────────────────────────────────

  private async initLeaflet(): Promise<void> {
    if (this.L) return;
    const leaflet = await import('leaflet');
    this.L = leaflet;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }

  private initMap(): void {
    if (!this.mapElement || this.map) return;
    if (!this.L) return;

    this.map = this.L.map(this.mapElement.nativeElement).setView([-17.7833, -63.1821], 13);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);
  }

  private actualizarMapa(): void {
    if (!this.map || !this.tracking || !this.L) return;

    const t = this.tracking;
    const iLat = t.latitud_incidente;
    const iLng = t.longitud_incidente;
    const tLat = t.tecnico_latitud;
    const tLng = t.tecnico_longitud;

    // Marcador del cliente (incidente) — icono rojo
    if (iLat != null && iLng != null) {
      const clientIcon = this.L.divIcon({
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:linear-gradient(135deg,#ef4444,#b91c1c);
          border:3px solid #fff;
          box-shadow:0 2px 8px rgba(239,68,68,0.6);
          display:flex;align-items:center;justify-content:center;
          font-size:14px;color:#fff;font-weight:bold;">📍</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      if (!this.incidentMarker) {
        this.incidentMarker = this.L.marker([iLat, iLng], { icon: clientIcon })
          .addTo(this.map)
          .bindPopup('<strong>Ubicación del cliente</strong>');
      } else {
        this.incidentMarker.setLatLng([iLat, iLng]);
      }
    }

    // Marcador del técnico — icono azul pulsante
    if (tLat != null && tLng != null) {
      const techIcon = this.L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:linear-gradient(135deg,#3b82f6,#1d4ed8);
          border:3px solid #fff;
          box-shadow:0 2px 10px rgba(59,130,246,0.7);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;color:#fff;">🚗</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      if (!this.techMarker) {
        this.techMarker = this.L.marker([tLat, tLng], { icon: techIcon })
          .addTo(this.map)
          .bindPopup(`<strong>${t.tecnico_nombre || 'Técnico'}</strong><br>En camino`);
      } else {
        this.techMarker.setLatLng([tLat, tLng]);
      }
    }

    // Polilínea de ruta entre técnico y cliente
    if (iLat != null && iLng != null && tLat != null && tLng != null) {
      if (!this.routePolyline) {
        this.routePolyline = this.L.polyline(
          [[tLat, tLng], [iLat, iLng]],
          { color: '#3b82f6', weight: 4, opacity: 0.75, dashArray: '8, 12' }
        ).addTo(this.map);
      } else {
        this.routePolyline.setLatLngs([[tLat, tLng], [iLat, iLng]]);
      }
    }

    // Ajustar vista para mostrar ambos marcadores
    const points: [number, number][] = [];
    if (iLat != null && iLng != null) points.push([iLat, iLng]);
    if (tLat != null && tLng != null) points.push([tLat, tLng]);

    if (points.length === 1) {
      this.map.setView(points[0], 15);
    } else if (points.length > 1) {
      this.map.fitBounds(points, { padding: [50, 50] });
    }
  }

  // ── WebSocket ──────────────────────────────────────────────

  private conectarWS(): void {
    this.desconectarWS();
    const url = this.api.getTrackingWebSocketUrl(this.incidenteId);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.wsConectado = true;
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
        }
      }, 15000);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('[TRACKING ADMIN] mensaje WS raw:', msg);

        // ── Normalizar payload ───────────────────────────────────────────
        // El backend puede emitir varias formas:
        //   1) { event: 'technician_location_updated', data: { latitud, longitud, ... } }
        //   2) { tracking: { tecnico_latitud, tecnico_longitud, ... } }   (legacy)
        //   3) { event: 'tracking_update', data: { ... } }

        let lat: number | null = null;
        let lng: number | null = null;
        let clientLat: number | null = null;
        let clientLng: number | null = null;
        let payload: any = null;

        if (msg?.event === 'technician_location_updated' && msg?.data) {
          // Forma 1: evento explícito con data plana
          const d = msg.data;
          lat = d.latitud ?? d.tecnico_latitud ?? null;
          lng = d.longitud ?? d.tecnico_longitud ?? null;
          clientLat = d.latitud_incidente ?? d.cliente_latitud ?? null;
          clientLng = d.longitud_incidente ?? d.cliente_longitud ?? null;
          payload = d;

          if (lat != null && lng != null) {
            this.tracking = {
              ...this.tracking,
              tecnico_latitud: lat,
              tecnico_longitud: lng,
              tecnico_nombre: d.tecnico_nombre ?? this.tracking?.tecnico_nombre,
              tecnico_ubicacion_actualizada_en: d.actualizado_en ?? new Date().toISOString(),
              ...(clientLat != null ? { latitud_incidente: clientLat } : {}),
              ...(clientLng != null ? { longitud_incidente: clientLng } : {}),
              ...(d.estado != null ? { estado: d.estado } : {}),
              ...(d.distancia_km != null ? { distancia_km: d.distancia_km } : {}),
              ...(d.eta_minutos != null ? { eta_minutos: d.eta_minutos } : {}),
            } as IncidenteTrackingDto;
          }
        } else if (msg?.event && msg?.data) {
          // Forma 3: otro evento genérico con data
          const d = msg.data;
          lat = d.tecnico_latitud ?? d.latitud ?? null;
          lng = d.tecnico_longitud ?? d.longitud ?? null;
          payload = d;
          if (lat != null && lng != null) {
            this.tracking = { ...this.tracking, tecnico_latitud: lat, tecnico_longitud: lng } as IncidenteTrackingDto;
          }
        } else if (msg?.tracking) {
          // Forma 2: legacy { tracking: { ... } }
          payload = msg.tracking;
          lat = payload.tecnico_latitud ?? null;
          lng = payload.tecnico_longitud ?? null;
          this.tracking = { ...this.tracking, ...payload } as IncidenteTrackingDto;
        }

        console.log('[TRACKING ADMIN] tracking payload normalizado', payload);
        console.log('[TRACKING ADMIN] lat tecnico', lat);
        console.log('[TRACKING ADMIN] lng tecnico', lng);

        // ── Si tenemos coordenadas válidas del técnico ───────────────────
        if (lat != null && lng != null) {
          // Dejar de mostrar loading en el primer mensaje válido
          if (this.cargando) {
            this.cargando = false;
            // Asegurar que el mapa esté inicializado antes de actualizar
            setTimeout(() => {
              this.initMap();
              this.actualizarMapa();
            }, 0);
          } else {
            this.actualizarMapa();
          }
        } else if (payload != null) {
          // Llegó un mensaje válido aunque sin coordenadas útiles
          if (this.cargando) {
            this.cargando = false;
            setTimeout(() => { this.initMap(); this.actualizarMapa(); }, 0);
          } else {
            this.actualizarMapa();
          }
        }

        console.log('[TRACKING ADMIN] loading final', this.cargando);
      } catch (e) {
        console.error('[TRACKING ADMIN] Error parseando WS:', e);
      }
    };

    this.ws.onclose = () => {
      this.wsConectado = false;
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
    };

    this.ws.onerror = () => {
      this.wsConectado = false;
    };
  }

  private desconectarWS(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsConectado = false;
  }

  // ── Helpers ────────────────────────────────────────────────

  volver(): void {
    this.router.navigate(['/app/incidentes']);
  }

  estadoLabel(estado: string | undefined): string {
    const mapa: Record<string, string> = {
      pendiente: 'Pendiente',
      aceptada: 'Aceptada',
      asignada: 'Asignada',
      en_camino: 'Técnico en camino',
      en_sitio: 'Técnico en sitio',
      atendido: 'Finalizado',
      completada: 'Completada',
      cancelada: 'Cancelada',
    };
    return mapa[estado ?? ''] ?? (estado ?? '—');
  }

  isEtapaActive(etapa: string): boolean {
    return (this.tracking?.estado ?? '') === etapa;
  }

  isEtapaDone(etapa: string): boolean {
    const estadoActual = this.tracking?.estado ?? '';
    const idx = this.ETAPAS.indexOf(etapa);
    const idxActual = this.ETAPAS.indexOf(estadoActual);
    return idx < idxActual;
  }

  formatDistancia(km: number | null | undefined): string {
    if (km == null) return 'Calculando...';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  }

  formatEta(minutos: number | null | undefined): string {
    if (minutos == null) return 'Calculando...';
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
}
