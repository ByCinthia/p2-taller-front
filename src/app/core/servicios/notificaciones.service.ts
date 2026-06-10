import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface NotificationDto {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creada_en: string;
  data?: Record<string, any>;
  tipo?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private base = `${environment.apiBaseUrl}/api`;
  private socket: WebSocket | null = null;
  private notificationSubject = new Subject<NotificationDto>();
  private reconnectInterval = 5000;
  private currentUserId: string | null = null;
  private pingIntervalId: any = null;

  // Manejo de estado reactivo local
  private notifications: NotificationDto[] = [];
  private readonly notificationsStateSubject = new BehaviorSubject<NotificationDto[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);

  readonly newNotification$ = this.notificationSubject.asObservable();
  readonly notifications$ = this.notificationsStateSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Carga inicial de notificaciones del historial
   */
  loadInitialNotifications(): void {
    this.getMyNotifications().subscribe({
      next: (list) => {
        this.notifications = list || [];
        this.notificationsStateSubject.next(this.notifications);
        this.updateUnreadCount();
      },
      error: (err) => console.error('[NotificationService] Error al cargar historial inicial:', err)
    });
  }

  /**
   * Agrega una nueva notificación al historial y actualiza el contador
   */
  addNotification(notification: NotificationDto): void {
    if (this.notifications.some(n => n.id === notification.id)) {
      return;
    }
    this.notifications = [notification, ...this.notifications];
    this.notificationsStateSubject.next(this.notifications);
    this.updateUnreadCount();
  }

  private updateUnreadCount(): void {
    const unread = this.notifications.filter(n => !n.leida).length;
    this.unreadCountSubject.next(unread);
  }

  /**
   * Obtiene todas las notificaciones del usuario actual desde el servidor
   */
  getMyNotifications(): Observable<NotificationDto[]> {
    return this.http
      .get<{ items: NotificationDto[]; total: number }>(`${this.base}/notificaciones/me/`)
      .pipe(
        map((res) => res.items || []),
        tap((list) => {
          this.notifications = list;
          this.notificationsStateSubject.next(this.notifications);
          this.updateUnreadCount();
        })
      );
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(notificationId: string): Observable<NotificationDto> {
    return this.http.patch<NotificationDto>(
      `${this.base}/notificaciones/${notificationId}/leer`,
      {}
    ).pipe(
      tap((updated) => {
        this.notifications = this.notifications.map(n => n.id === updated.id ? { ...n, leida: true } : n);
        this.notificationsStateSubject.next(this.notifications);
        this.updateUnreadCount();
      })
    );
  }

  /**
   * Obtiene el detalle de una notificación
   */
  getDetail(notificationId: string): Observable<NotificationDto> {
    return this.getMyNotifications().pipe(
      map((items) => items.find((i) => i.id === notificationId) as NotificationDto)
    );
  }

  /**
   * Conecta al WebSocket de notificaciones en tiempo real para el usuario actual
   */
  connectWebSocket(userId: string): void {
    if (this.currentUserId === userId && this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnectWebSocket();
    this.currentUserId = userId;

    const apiBase = environment.apiBaseUrl.replace(/\/$/, '');
    const wsProtocol = apiBase.startsWith('https') ? 'wss://' : 'ws://';
    const cleanBase = apiBase.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}${cleanBase}/api/ws/tracking/notifications/${userId}`;

    console.log(`[NotificationService] Conectando a WS notificaciones: ${wsUrl}`);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log(`[NotificationService] Conectado a WS de notificaciones del usuario: ${userId}`);
      this.startPing();
    };

    this.socket.onmessage = (event) => {
      try {
        if (event.data === 'pong') {
          return;
        }
        const data: NotificationDto = JSON.parse(event.data);
        if (data && data.id) {
          console.log('[NotificationService] Nueva notificación en vivo recibida:', data);
          this.addNotification(data);
          this.notificationSubject.next(data);
        }
      } catch (err) {
        console.error('[NotificationService] Error al parsear notificación:', err);
      }
    };

    this.socket.onerror = (error) => {
      console.error('[NotificationService] Error en WS notificaciones:', error);
    };

    this.socket.onclose = (event) => {
      this.stopPing();
      console.log(`[NotificationService] Conexión WS notificaciones cerrada. Código: ${event.code}`);
      
      // Auto-reconexión si el usuario no ha cerrado sesión
      if (this.currentUserId === userId) {
        setTimeout(() => {
          if (this.currentUserId === userId) {
            console.log('[NotificationService] Reintentando conectar a WS de notificaciones...');
            this.connectWebSocket(userId);
          }
        }, this.reconnectInterval);
      }
    };
  }

  /**
   * Cierra el WebSocket de notificaciones
   */
  disconnectWebSocket(): void {
    this.stopPing();
    this.currentUserId = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 15000);
  }

  private stopPing(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnectWebSocket();
  }
}
