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
  <div class="state-box" *ngIf="cargando && !tracking">
    <div class="spinner"></div>
    <p>Cargando información de tracking...</p>
  </div>

  <!-- Error -->
  <div class="state-box error-box" *ngIf="!cargando && error">
    <p class="error-text">{{ error }}</p>
    <button class="btn-back" (click)="volver()">Regresar</button>
  </div>

  <!-- Main content -->
  <div class="tracking-content" *ngIf="tracking && !error">

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
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      color: var(--text, #e2e8f0);
      padding: 9px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .btn-back:hover { background: rgba(255,255,255,0.14); }

    .page-title {
      margin: 0 0 4px;
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text, #e2e8f0);
      letter-spacing: -0.3px;
    }
    .page-subtitle {
      margin: 0;
      font-size: 0.88rem;
      color: var(--muted, #94a3b8);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ws-indicator {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--muted, #94a3b8);
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 6px 12px;
      border-radius: 20px;
    }
    .ws-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #475569;
      transition: background 0.3s;
    }
    .ws-indicator.connected { color: #4ade80; border-color: rgba(74,222,128,0.25); background: rgba(74,222,128,0.07); }
    .ws-indicator.connected .ws-dot { background: #4ade80; box-shadow: 0 0 6px #4ade80; animation: pulse-ws 1.5s infinite; }
    @keyframes pulse-ws { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .btn-refresh {
      background: rgba(12, 123, 147, 0.15);
      border: 1px solid rgba(12, 123, 147, 0.3);
      color: #38bdf8;
      padding: 8px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-refresh:hover:not(:disabled) { background: rgba(12, 123, 147, 0.25); }
    .btn-refresh:disabled { opacity: 0.4; cursor: default; }

    /* ── State boxes ── */
    .state-box {
      display: flex; flex-direction: column; align-items: center;
      gap: 16px; padding: 80px 24px;
      color: var(--muted, #94a3b8);
    }
    .error-box { color: #f87171; }
    .error-text { font-size: 1rem; text-align: center; }
    .spinner {
      width: 44px; height: 44px;
      border: 4px solid rgba(255,255,255,0.1);
      border-top-color: #38bdf8;
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
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .glass-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.28); transform: translateY(-2px); }

    .card-header {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .accent-blue  { background: rgba(12, 123, 147, 0.12); }
    .accent-cyan  { background: rgba(56, 189, 248, 0.1); }
    .accent-green { background: rgba(74, 222, 128, 0.08); }

    .card-label {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94a3b8;
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
      font-size: 0.8rem;
      color: #64748b;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .data-value {
      font-size: 0.88rem;
      color: #e2e8f0;
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }
    .data-value.desc { font-size: 0.84rem; font-weight: 400; color: #94a3b8; }
    .data-value.coords { font-family: 'Courier New', monospace; font-size: 0.8rem; }
    .data-value.muted { color: #64748b; font-weight: 400; }
    .data-value.highlight { color: #38bdf8; font-size: 1rem; }

    /* ── Estado badge ── */
    .badge-estado {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      border: 1px solid;
    }
    .estado-pendiente  { background: rgba(250,204,21,0.12);  color: #fbbf24; border-color: rgba(251,191,36,0.3); }
    .estado-aceptada   { background: rgba(56,189,248,0.1);   color: #38bdf8; border-color: rgba(56,189,248,0.3); }
    .estado-asignada   { background: rgba(139,92,246,0.1);   color: #a78bfa; border-color: rgba(139,92,246,0.3); }
    .estado-en_camino  { background: rgba(251,146,60,0.12);  color: #fb923c; border-color: rgba(251,146,60,0.3); }
    .estado-en_sitio   { background: rgba(52,211,153,0.1);   color: #34d399; border-color: rgba(52,211,153,0.3); }
    .estado-atendido,
    .estado-completada { background: rgba(74,222,128,0.1);   color: #4ade80; border-color: rgba(74,222,128,0.3); }
    .estado-cancelada  { background: rgba(248,113,113,0.1);  color: #f87171; border-color: rgba(248,113,113,0.3); }

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
      border: 2px solid #475569;
      background: #1e293b;
      transition: all 0.3s;
    }
    .etapa-name {
      font-size: 0.68rem;
      color: #64748b;
      white-space: nowrap;
      font-weight: 500;
    }
    .etapa-step.active .etapa-dot { border-color: #38bdf8; background: #38bdf8; box-shadow: 0 0 8px rgba(56,189,248,0.5); }
    .etapa-step.active .etapa-name { color: #38bdf8; font-weight: 700; }
    .etapa-step.done .etapa-dot { border-color: #4ade80; background: #4ade80; }
    .etapa-step.done .etapa-name { color: #4ade80; }
    .etapa-line {
      flex: 1;
      height: 2px;
      background: #334155;
      min-width: 12px;
      max-width: 32px;
      margin-bottom: 16px;
    }

    /* ── Map section ── */
    .map-section {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      overflow: hidden;
    }
    .map-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .map-header .muted { color: #64748b; font-size: 0.84rem; }
    .pulse-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
      animation: pulse-ws 1.2s infinite;
    }
    .map-canvas {
      width: 100%;
      height: 460px;
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
  ) {}

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

    // Cargar tracking (contiene toda la info necesaria)
    this.api.getTracking(this.incidenteId).subscribe({
      next: (t) => {
        this.tracking = t;
        this.cargando = false;
        setTimeout(() => {
          this.initMap();
          this.actualizarMapa();
        }, 0);
        this.conectarWS();
      },
      error: () => {
        this.error = 'No se pudo cargar la información de tracking del incidente.';
        this.cargando = false;
      },
    });

    // Cargar datos básicos del incidente en paralelo
    this.api.get(this.incidenteId).subscribe({
      next: (inc) => { this.incidente = inc; },
      error: () => { /* datos básicos opcionales */ },
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
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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
        console.log('[TRACKING ADMIN] mensaje WS:', msg);
        if (msg?.tracking) {
          this.tracking = { ...this.tracking, ...msg.tracking } as IncidenteTrackingDto;
          this.actualizarMapa();
        }
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
      aceptada:  'Aceptada',
      asignada:  'Asignada',
      en_camino: 'Técnico en camino',
      en_sitio:  'Técnico en sitio',
      atendido:  'Finalizado',
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
