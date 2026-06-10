import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TrackingData {
  event: string;
  incidente_id: string;
  latitud: number;
  longitud: number;
}

@Injectable({
  providedIn: 'root',
})
export class MapTrackingService implements OnDestroy {
  private socket: WebSocket | null = null;
  private trackingSubject = new Subject<TrackingData>();
  private connectionStatusSubject = new Subject<boolean>();
  private reconnectInterval = 5000; // Intentar reconectar cada 5 segundos
  private currentIncidentId: string | null = null;
  private pingIntervalId: any = null;

  constructor() {}

  /**
   * Estado de la conexión WebSocket como un Observable.
   */
  get connectionStatus$(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  /**
   * Flujo de actualizaciones de coordenadas del técnico.
   */
  get trackingUpdates$(): Observable<TrackingData> {
    return this.trackingSubject.asObservable();
  }

  /**
   * Establece conexión WebSocket con el backend para un incidente en particular.
   */
  connect(incidentId: string): void {
    if (this.currentIncidentId === incidentId && this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnect(); // Desconectar sesión previa si existiera
    this.currentIncidentId = incidentId;
    this.connectionStatusSubject.next(false);

    const apiBase = environment.apiBaseUrl.replace(/\/$/, '');
    const wsProtocol = apiBase.startsWith('https') ? 'wss://' : 'ws://';
    const cleanBase = apiBase.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}${cleanBase}/api/ws/tracking/${incidentId}/client`;

    console.log(`Intentando conectar al WebSocket de rastreo: ${wsUrl}`);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.connectionStatusSubject.next(true);
      console.log(`Conectado al WebSocket de rastreo para el incidente: ${incidentId}`);
      this.startPing();
    };

    this.socket.onmessage = (event) => {
      try {
        if (event.data === 'pong') {
          return;
        }
        const data: TrackingData = JSON.parse(event.data);
        if (data && data.latitud && data.longitud) {
          this.trackingSubject.next(data);
        }
      } catch (err) {
        console.error('Error al parsear payload del WebSocket:', err);
      }
    };

    this.socket.onerror = (error) => {
      console.error('Error en conexión WebSocket de rastreo:', error);
      this.connectionStatusSubject.next(false);
    };

    this.socket.onclose = (event) => {
      this.connectionStatusSubject.next(false);
      this.stopPing();
      console.log(`Conexión WebSocket de rastreo cerrada para incidente ${incidentId}. Código: ${event.code}`);
      
      // Auto-reconexión si el incidente actual sigue activo
      if (this.currentIncidentId === incidentId) {
        setTimeout(() => {
          if (this.currentIncidentId === incidentId) {
            console.log('Reintentando conectar al WebSocket...');
            this.connect(incidentId);
          }
        }, this.reconnectInterval);
      }
    };
  }

  /**
   * Cierra la conexión del WebSocket.
   */
  disconnect(): void {
    this.stopPing();
    this.currentIncidentId = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connectionStatusSubject.next(false);
  }

  private startPing(): void {
    this.stopPing();
    this.pingIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 15000); // Latido cada 15 segundos
  }

  private stopPing(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
