import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SidebarComponent } from '../../componentes_globales/barra_lateral/barra_lateral.component';
import { TopbarComponent } from '../../componentes_globales/barra_superior/barra_superior.component';
import { ToastContainerComponent } from '../../componentes_globales/contenedor_toast/contenedor_toast.component';
import { NotificationAlertComponent } from '../../componentes_globales/notificacion_alerta/notificacion_alerta.component';
import { PushNotificationService } from '../../services/push-notification.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    TopbarComponent,
    ToastContainerComponent,
    NotificationAlertComponent
  ],
  templateUrl: './diseno_principal.component.html',
  styleUrls: ['./diseno_principal.component.css'],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  activeAlertIncidentId: string | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly pushNotificationService: PushNotificationService,
    private readonly toastService: ToastService,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.initializeNotifications();
    this.setupNotificationWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.notificationService.disconnectWebSocket();
  }

  /**
   * Conectar a la pasarela WebSocket de notificaciones y manejar el rol
   */
  private setupNotificationWebSocket(): void {
    this.authService.decodedToken$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          // Conectar al socket usando el user_id decodificado (sub)
          this.notificationService.connectWebSocket(user.sub);
          // Cargar historial inicial silenciosamente
          this.notificationService.loadInitialNotifications();
        } else {
          this.notificationService.disconnectWebSocket();
        }
      });

    this.notificationService.newNotification$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        const user = this.authService.currentUser;
        if (!user) return;

        // Validar si el usuario tiene el rol de Administrador de Taller
        const isAdminTaller = user.role === 'ADMIN_TALLER' || (user.roles && user.roles.includes('ADMIN_TALLER'));

        if (isAdminTaller) {
          // Extraemos el incidente_id de los metadatos de la notificación
          const incidentId = notification.data?.['incidente_id'] || notification.data?.['id'];
          if (incidentId) {
            console.log('[MainLayoutComponent] Recibida notificación de auxilio para Administrador:', incidentId);
            this.activeAlertIncidentId = incidentId;
          }
        }

        // --- Lógica para EMPLEADO/TÉCNICO ---
        const roleStr = String(user.role || '').toLowerCase();
        const rolesArr = (user.roles || []).map((r: string) => String(r).toLowerCase());
        const isEmpleado = roleStr === 'empleado' || roleStr === 'tecnico' || rolesArr.includes('empleado') || rolesArr.includes('tecnico');

        if (isEmpleado) {
          const validTypes = [
            'nueva_asignacion',
            'asignacion_tecnico',
            'tecnico_asignado',
            'assignment_created',
            'nueva_solicitud_auxilio'
          ];
          
          const notifType = String(notification.tipo || '').toLowerCase();
          
          if (validTypes.includes(notifType)) {
            const incidentId = notification.data?.['incidente_id'] || notification.data?.['incidentId'];
            
            // Evitar toasts vacíos
            if (!notification.titulo && !notification.mensaje && !incidentId) return;

            const title = notification.titulo || 'Nueva Solicitud de Auxilio';
            const message = notification.mensaje || `Incidente ${incidentId || 'asignado'} requiere atención`;

            this.toastService.show({
              type: 'info',
              title: title,
              message: message,
              duration: 10000,
              action: {
                label: 'Ver solicitud',
                callback: () => {
                  const queryParams = incidentId ? { incidente_id: incidentId } : {};
                  this.router.navigate(['/app/empleado/asignaciones/asignadas'], { queryParams });
                }
              }
            });
          }
        }
      });
  }

  /**
   * Inicializar listeners de notificaciones de Firebase
   */
  private async initializeNotifications(): Promise<void> {
    try {
      // Registrar el Service Worker
      await this.pushNotificationService.registerServiceWorker();

      // Registrar listener para mensajes en foreground (espera a que Firebase esté inicializado)
      await this.pushNotificationService.registerForegroundMessageListener(
        (msg) => {
          console.log('[MainLayoutComponent] Message received:', msg);

          const title = msg.title || 'Nueva notificación';
          const body = msg.body || 'Tienes una nueva notificación';

          const incidentId = msg.incidentId || msg.data?.['incidente_id'];
          if (incidentId) {
            this.toastService.incidentNotification(incidentId, {
              label: 'Ver solicitud',
              callback: () => {
                const queryParams = incidentId ? { incidente_id: incidentId } : {};
                this.router.navigate(['/app/empleado/asignaciones/asignadas'], { queryParams });
              },
            });
          } else {
            this.toastService.info(title, body);
          }
        },
        (incidentId) => {
          console.log('[MainLayoutComponent] Incident notification:', incidentId);
          const queryParams = incidentId ? { incidente_id: incidentId } : {};
          this.router.navigate(['/app/empleado/asignaciones/asignadas'], { queryParams });
        }
      );
    } catch (error) {
      console.error('[MainLayoutComponent] Error initializing notifications:', error);
    }
  }
}
