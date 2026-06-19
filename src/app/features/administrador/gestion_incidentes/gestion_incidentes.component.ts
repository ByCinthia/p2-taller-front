import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';

import {
  IncidenteApiService,
  IncidenteDto,
  IncidenteTrackingDto,
  TecnicoCercanoDto,
} from '../../services/incidente.service';
import { AuthService } from '../../services/auth/auth.service';
import { ClienteApiService, VehiculoDto } from '../../services/cliente.service';
import { EmpresaApiService } from '../../../core/servicios/empresas.api.service';

@Component({
  selector: 'app-incidentes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './gestion_incidentes.component.html',
  styleUrls: ['./gestion_incidentes.component.css'],
})
export class IncidentesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('reportMap') reportMapElement?: ElementRef<HTMLDivElement>;
  @ViewChild('trackingMap') trackingMapElement?: ElementRef<HTMLDivElement>;

  private L: any;
  private reportMap: any;
  private trackingMap: any;
  private reportMarker: any;
  private currentLocationMarker: any;
  private trackingIncidentMarker: any;
  private trackingTechMarker: any;
  private trackingRoutePolyline: any;
  private voiceRecorder: MediaRecorder | null = null;
  private voiceChunks: BlobPart[] = [];
  private voiceStream: MediaStream | null = null;

  private trackingSocket: WebSocket | null = null;
  private trackingPingTimer: ReturnType<typeof setInterval> | null = null;
  trackingSocketConnected = false;

  watchPositionId: number | null = null;
  currentLat: number | null = null;
  currentLng: number | null = null;

  incidents: IncidenteDto[] = [];
  myVehicles: VehiculoDto[] = [];
  selectedTracking: IncidenteTrackingDto | null = null;
  tecnicosCercanos: TecnicoCercanoDto[] = [];
  asignaciones: Record<string, string> = {};
  showEvidencePanel = false;
  imageEvidenceFiles: File[] = [];
  audioEvidenceFile: File | null = null;
  recordingVoice = false;
  voicePreviewUrl: string | null = null;
  message = '';
  miDisponible = true;
  isClient = false;
  clienteId: string | null = null;
  showIncidentList = false;

  createForm: {
    vehiculo_id: string;
    tipo: string;
    descripcion: string;
    prioridad: number | null;
    latitud: number | null;
    longitud: number | null;
  } = {
    vehiculo_id: '',
    tipo: '',
    descripcion: '',
    prioridad: null,
    latitud: null,
    longitud: null,
  };

  loading = false;
  liveLocationEnabled = true;

  constructor(
    private api: IncidenteApiService,
    public auth: AuthService,
    private clienteApi: ClienteApiService,
    private router: Router,
    private route: ActivatedRoute,
    private empresaApi: EmpresaApiService,
  ) {}

  ngOnInit(): void {
    this.isClient = this.auth.isClient;
    this.clienteId = this.auth.currentUser?.cliente_id || null;
    this.showIncidentList = this.isClient && this.router.url.includes('/incidentes/lista');
    if (this.isClient) {
      this.loadMyVehicles();
    }
    this.load();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initLeaflet();
    this.initReportMap();
    this.initTrackingMap();
  }

  ngOnDestroy(): void {
    this.stopRealtimeLocation();
    this.disconnectTrackingSocket();
    this.stopClientLiveLocation();
    if (this.voicePreviewUrl) {
      URL.revokeObjectURL(this.voicePreviewUrl);
    }
  }

  private async initLeaflet(): Promise<void> {
    if (this.L) {
      return;
    }

    const leaflet = await import('leaflet');
    this.L = leaflet;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }

  private initReportMap(): void {
    if (!this.reportMapElement || this.reportMap) {
      return;
    }

    this.reportMap = this.L.map(this.reportMapElement.nativeElement).setView([-17.7833, -63.1821], 13);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.reportMap);

    this.reportMap.on('click', (e: any) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      this.setIncidentLocation(lat, lng);
    });
  }

  private initTrackingMap(): void {
    if (!this.trackingMapElement || this.trackingMap) {
      return;
    }

    this.trackingMap = this.L.map(this.trackingMapElement.nativeElement).setView([-17.7833, -63.1821], 13);
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.trackingMap);
  }

  private setIncidentLocation(lat: number, lng: number): void {
    this.createForm.latitud = lat;
    this.createForm.longitud = lng;

    if (!this.reportMap) {
      return;
    }

    if (!this.reportMarker) {
      this.reportMarker = this.L.marker([lat, lng]).addTo(this.reportMap);
    } else {
      this.reportMarker.setLatLng([lat, lng]);
    }
    this.reportMap.setView([lat, lng], 15);
  }

  private setCurrentLocation(lat: number, lng: number): void {
    this.currentLat = lat;
    this.currentLng = lng;
    this.setIncidentLocation(lat, lng);

    if (!this.reportMap) {
      return;
    }

    if (!this.currentLocationMarker) {
      this.currentLocationMarker = this.L.circleMarker([lat, lng], {
        radius: 8,
        color: this.isClient ? '#ef4444' : '#22c55e',
        fillColor: this.isClient ? '#ef4444' : '#22c55e',
        fillOpacity: 0.8,
      }).addTo(this.reportMap);
    } else {
      this.currentLocationMarker.setLatLng([lat, lng]);
      this.currentLocationMarker.setStyle({
        color: this.isClient ? '#ef4444' : '#22c55e',
        fillColor: this.isClient ? '#ef4444' : '#22c55e',
      });
    }
  }

  private startClientLiveLocation(): void {
    if (!navigator.geolocation || this.watchPositionId != null) {
      return;
    }

    this.watchPositionId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        this.setCurrentLocation(lat, lng);
      },
      () => {
        this.message = 'No se pudo obtener tu ubicación en tiempo real';
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 12000,
      },
    );
  }

  private stopClientLiveLocation(): void {
    this.stopRealtimeLocation();
  }

  private updateTrackingMap(): void {
    if (!this.trackingMap && this.trackingMapElement) {
      this.initTrackingMap();
    }

    if (!this.selectedTracking || !this.trackingMap) {
      return;
    }

    const t = this.selectedTracking;
    const incidentLat = t.latitud_incidente;
    const incidentLng = t.longitud_incidente;
    const techLat = t.tecnico_latitud;
    const techLng = t.tecnico_longitud;

    if (incidentLat != null && incidentLng != null) {
      if (!this.trackingIncidentMarker) {
        this.trackingIncidentMarker = this.L.marker([incidentLat, incidentLng]).addTo(this.trackingMap);
      } else {
        this.trackingIncidentMarker.setLatLng([incidentLat, incidentLng]);
      }
    }

    if (techLat != null && techLng != null) {
      if (!this.trackingTechMarker) {
        this.trackingTechMarker = this.L.circleMarker([techLat, techLng], {
          radius: 8,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
        }).addTo(this.trackingMap);
      } else {
        this.trackingTechMarker.setLatLng([techLat, techLng]);
      }
    }

    if (incidentLat != null && incidentLng != null && techLat != null && techLng != null) {
      if (!this.trackingRoutePolyline) {
        this.trackingRoutePolyline = this.L.polyline([[techLat, techLng], [incidentLat, incidentLng]], {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
          dashArray: '5, 10'
        }).addTo(this.trackingMap);
      } else {
        this.trackingRoutePolyline.setLatLngs([[techLat, techLng], [incidentLat, incidentLng]]);
      }
    }

    const points: [number, number][] = [];
    if (incidentLat != null && incidentLng != null) points.push([incidentLat, incidentLng]);
    if (techLat != null && techLng != null) points.push([techLat, techLng]);

    if (points.length === 1) {
      this.trackingMap.setView(points[0], 15);
    } else if (points.length > 1) {
      this.trackingMap.fitBounds(points, { padding: [30, 30] });
    }
  }

  private connectTrackingSocket(incidenteId: string): void {
    this.disconnectTrackingSocket();
    const url = this.api.getTrackingWebSocketUrl(incidenteId);
    this.trackingSocket = new WebSocket(url);

    this.trackingSocket.onopen = () => {
      this.trackingSocketConnected = true;
      this.trackingPingTimer = setInterval(() => {
        if (this.trackingSocket?.readyState === WebSocket.OPEN) {
          this.trackingSocket.send('ping');
        }
      }, 15000);
    };



    this.trackingSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[TRACKING ADMIN]\nmensaje recibido:\n', JSON.stringify(message, null, 2));
        if (message?.tracking) {
          this.selectedTracking = message.tracking as IncidenteTrackingDto;
          this.updateTrackingMap();
        }
      } catch (err) {
        console.error('Error parseando WS tracking message:', err);
      }
    };

    this.trackingSocket.onclose = () => {
      this.trackingSocketConnected = false;
      if (this.trackingPingTimer) {
        clearInterval(this.trackingPingTimer);
        this.trackingPingTimer = null;
      }
    };
  }

  private disconnectTrackingSocket(): void {
    if (this.trackingPingTimer) {
      clearInterval(this.trackingPingTimer);
      this.trackingPingTimer = null;
    }
    if (this.trackingSocket) {
      this.trackingSocket.close();
      this.trackingSocket = null;
    }
    this.trackingSocketConnected = false;
  }

  load() {
    this.loading = true;
    this.api.list().subscribe({
      next: (rows) => {
        const all = rows || [];
        if (this.isClient) {
          this.incidents = this.clienteId ? all.filter((item) => item.cliente_id === this.clienteId) : [];
        } else {
          this.incidents = all;
        }
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  loadMyVehicles() {
    this.clienteApi.listMyVehiculos().subscribe({
      next: (rows) => {
        this.myVehicles = rows || [];
      },
      error: () => {
        this.message = 'No se pudieron cargar tus vehículos';
      },
    });
  }

  async toggleVoiceRecording() {
    if (this.recordingVoice) {
      await this.stopVoiceRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.message = 'Tu navegador no permite grabar audio';
      return;
    }

    try {
      this.voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.voiceChunks = [];
      this.voiceRecorder = new MediaRecorder(this.voiceStream);
      this.recordingVoice = true;
      this.voiceRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.voiceChunks.push(event.data);
        }
      };
      this.voiceRecorder.onstop = () => {
        const blob = new Blob(this.voiceChunks, { type: 'audio/webm' });
        if (this.voicePreviewUrl) {
          URL.revokeObjectURL(this.voicePreviewUrl);
        }
        this.voicePreviewUrl = URL.createObjectURL(blob);
        this.audioEvidenceFile = new File([blob], `voz-${Date.now()}.webm`, { type: blob.type });
        this.recordingVoice = false;
        this.voiceStream?.getTracks().forEach((track) => track.stop());
        this.voiceStream = null;
      };
      this.voiceRecorder.start();
    } catch {
      this.message = 'No se pudo iniciar la grabación de voz';
      this.recordingVoice = false;
      this.voiceStream?.getTracks().forEach((track) => track.stop());
      this.voiceStream = null;
    }
  }

  private stopVoiceRecording(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.voiceRecorder || this.voiceRecorder.state === 'inactive') {
        this.recordingVoice = false;
        resolve();
        return;
      }

      this.voiceRecorder.addEventListener('stop', () => resolve(), { once: true });
      this.voiceRecorder.stop();
    });
  }

  onImageEvidenceSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.imageEvidenceFiles = files;
  }

  onAudioEvidenceSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.audioEvidenceFile = file;
  }

  saveStatus(it: IncidenteDto) {
    this.api.update(it.id, { estado: it.estado }).subscribe({ next: () => this.load() });
  }

  createIncident() {
    if (this.isClient) {
      const hasText = !!this.createForm.descripcion?.trim();
      const hasAudio = !!this.audioEvidenceFile;
      if (!this.createForm.vehiculo_id || !this.createForm.tipo || !this.createForm.latitud || !this.createForm.longitud || (!hasText && !hasAudio)) {
        this.message = 'Debes completar vehículo, tipo, mapa y descripción en texto o audio';
        return;
      }
    }

    this.api.create({
      vehiculo_id: this.createForm.vehiculo_id || undefined,
      tipo: this.createForm.tipo || undefined,
      descripcion: this.createForm.descripcion || (this.isClient && this.audioEvidenceFile ? 'Descripción adjunta en audio.' : undefined),
      prioridad: this.isClient ? undefined : (this.createForm.prioridad ?? undefined),
      latitud: this.createForm.latitud ?? undefined,
      longitud: this.createForm.longitud ?? undefined,
    }).subscribe({
      next: (created) => {
        if (this.isClient) {
          this.uploadClientEvidences(created.id);
          return;
        }
        this.message = 'Incidente creado correctamente';
        this.load();
      },
      error: () => {
        this.message = 'No se pudo crear el incidente';
      },
    });
  }

  private uploadClientEvidences(incidenteId: string) {
    const uploads = [
      ...this.imageEvidenceFiles.map((file) => this.api.uploadEvidenciaArchivo(incidenteId, file, 'foto')),
      ...(this.audioEvidenceFile ? [this.api.uploadEvidenciaArchivo(incidenteId, this.audioEvidenceFile, 'audio')] : []),
    ];

    if (uploads.length === 0) {
      this.message = 'Solicitud de auxilio enviada correctamente';
      this.resetClientRequestForm();
      this.load();
      return;
    }

    forkJoin(uploads).subscribe({
      next: () => {
        this.message = 'Solicitud de auxilio y evidencias enviadas correctamente';
        this.resetClientRequestForm();
        this.load();
      },
      error: () => {
        this.message = 'La solicitud se creó, pero hubo un error al subir evidencias';
        this.load();
      },
    });
  }

  private resetClientRequestForm() {
    this.createForm = {
      vehiculo_id: '',
      tipo: '',
      descripcion: '',
      prioridad: null,
      latitud: null,
      longitud: null,
    };
    this.imageEvidenceFiles = [];
    this.audioEvidenceFile = null;
    this.showEvidencePanel = false;
    if (this.voicePreviewUrl) {
      URL.revokeObjectURL(this.voicePreviewUrl);
      this.voicePreviewUrl = null;
    }
  }

  assignTecnico(it: IncidenteDto) {
    const empleadoId = this.asignaciones[it.id]?.trim();
    if (!empleadoId) {
      this.message = 'Debes ingresar el empleado_id para asignar';
      return;
    }

    this.api.assignTecnico(it.id, { empleado_id: empleadoId }).subscribe({
      next: () => {
        this.message = 'Técnico asignado';
        this.load();
      },
      error: () => {
        this.message = 'No se pudo asignar el técnico';
      },
    });
  }

  acceptIncident(it: IncidenteDto) {
    this.api.acceptIncident(it.id).subscribe({
      next: () => {
        this.message = 'Solicitud aceptada';
        this.load();
        this.empresaApi.refreshMyEmpresa().subscribe({ next: () => {}, error: (err: any) => console.error('Error refrescando empresa:', err) });
      },
      error: (err: any) => {
        console.error('Error aceptando incidente:', err);
        this.message = 'No se pudo aceptar la solicitud';
      },
    });
  }

  cancelarAceptacion(it: IncidenteDto) {
    this.api.cancelAcceptance(it.id).subscribe({
      next: () => {
        this.message = 'Aceptación cancelada';
        this.load();
        this.empresaApi.refreshMyEmpresa().subscribe({ next: () => {}, error: (err: any) => console.error('Error refrescando empresa:', err) });
      },
      error: (err: any) => {
        console.error('Error cancelando aceptación:', err);
        this.message = 'No se pudo cancelar la aceptación';
      },

    });
  }

  get pendingIncidents(): IncidenteDto[] {
    return this.incidents.filter(it => it.estado === 'pendiente');
  }

  get otherIncidents(): IncidenteDto[] {
    return this.incidents.filter(it => it.estado !== 'pendiente');
  }

  openTracking(it: IncidenteDto) {
    this.router.navigate(['/app/incidentes', it.id, 'tracking']);
  }

  refreshTracking() {
    if (!this.selectedTracking?.incidente_id) {
      return;
    }
    this.api.getTracking(this.selectedTracking.incidente_id).subscribe({
      next: (tracking) => {
        this.selectedTracking = tracking;
        setTimeout(() => this.updateTrackingMap(), 0);
      },
      error: () => {
        this.message = 'No se pudo refrescar el tracking';
      },
    });
  }

  toggleTrackingSocket() {
    if (!this.selectedTracking?.incidente_id) {
      return;
    }
    if (this.trackingSocketConnected) {
      this.disconnectTrackingSocket();
      return;
    }
    this.connectTrackingSocket(this.selectedTracking.incidente_id);
  }

  buscarTecnicosCercanosTracking() {
    const tracking = this.selectedTracking;
    if (!tracking || tracking.latitud_incidente == null || tracking.longitud_incidente == null) {
      this.message = 'El incidente no tiene latitud/longitud para búsqueda';
      return;
    }
    this.api.listTecnicosDisponibles(tracking.latitud_incidente, tracking.longitud_incidente).subscribe({
      next: (rows) => {
        this.tecnicosCercanos = rows || [];
      },
      error: () => {
        this.message = 'No se pudieron cargar técnicos cercanos';
      },
    });
  }


  
  useBrowserLocationForIncident() {
    if (!navigator.geolocation) {
      this.message = 'Geolocalización no disponible en este navegador';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.setCurrentLocation(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        );
      },
      () => {
        this.message = 'No se pudo obtener la ubicación actual';
      },
    );
  }

  toggleRealtimeLocation() {
    if (this.watchPositionId == null) {
      this.startRealtimeLocation();
      return;
    }
    this.stopRealtimeLocation();
  }

  private startRealtimeLocation() {
    if (!navigator.geolocation) {
      this.message = 'Geolocalización no disponible en este navegador';
      return;
    }

    this.watchPositionId = navigator.geolocation.watchPosition(
      (position) => {
        this.setCurrentLocation(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        );
      },
      () => {
        this.message = 'No se pudo iniciar ubicación en tiempo real';
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000,
      },
    );
  }

  private stopRealtimeLocation() {
    if (this.watchPositionId != null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
  }

  actualizarMiUbicacion() {
    if (!navigator.geolocation) {
      this.message = 'Geolocalización no disponible en este navegador';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.api.updateMiUbicacion({
          latitud: Number(position.coords.latitude.toFixed(6)),
          longitud: Number(position.coords.longitude.toFixed(6)),
          disponible: this.miDisponible,
        }).subscribe({
          next: () => {
            this.message = 'Ubicación actualizada';
          },
          error: () => {
            this.message = 'No se pudo actualizar tu ubicación';
          },
        });
      },
      () => {
        this.message = 'No se pudo obtener la ubicación actual';
      },
    );
  }

  addDiagPrompt(it: IncidenteDto) {
    const resumen = prompt('Resumen corto del diagnóstico');
    const clas = parseInt(prompt('Clasificación (número)') || '') || null;
    const prioridad = parseInt(prompt('Prioridad (número)') || '') || null;
    this.api.addDiagnostico(it.id, { clasificacion: clas, resumen, prioridad }).subscribe({ next: () => this.load() });
  }

  addEvidPrompt(it: IncidenteDto) {
    const url = prompt('URL de la evidencia (imagen/audio)');
    if (!url) return;
    this.api.addEvidencia(it.id, 'foto', url).subscribe({ next: () => this.load() });
  }

  formatEta(minutos: number | null | undefined): string {
    if (minutos == null) return 'Sin ETA';
    if (minutos < 60) return `${minutos} min`;

    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    if (mins === 0) return `${horas} h`;
    return `${horas} h ${mins} min`;
  }

  formatDistancia(km: number | null | undefined): string {
    if (km == null) return 'Sin ubicación';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  }
}

