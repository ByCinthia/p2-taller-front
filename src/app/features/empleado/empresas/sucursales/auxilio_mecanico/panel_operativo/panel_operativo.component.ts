import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { AuthService } from '../../services/auth/auth.service';
import { EmpleadoApiService } from '../../services/empleado.service';
import { NotificationService, type NotificationDto } from '../../services/notification.service';
import type { Empleado } from '../../models/user-management.models';

@Component({
  selector: 'app-empleado-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './panel_operativo.component.html',
    styleUrls: ['./panel_operativo.component.css'],
})
export class EmpleadoPanelComponent implements OnInit {
  empleado: Empleado | null = null;
  loadingProfile = false;
  errorMsg = '';
  notifications: NotificationDto[] = [];
  selectedNotification: NotificationDto | null = null;
  loadingNotifications = false;

  constructor(
    public readonly auth: AuthService,
    private readonly empleadoApi: EmpleadoApiService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadNotifications();
  }

  loadProfile(): void {
    this.errorMsg = '';
    this.loadingProfile = true;

    this.empleadoApi.getMe().subscribe({
      next: (perfil) => {
        this.empleado = perfil;
        this.loadingProfile = false;
      },
      error: (error) => {
        this.loadingProfile = false;
        this.errorMsg = error?.error?.detail || 'No se pudo cargar tu perfil de empleado.';
      },
    });
  }

  loadNotifications(): void {
    this.loadingNotifications = true;
    this.notificationService.getMyNotifications().subscribe({
      next: (notifs) => {
        this.notifications = notifs;
        this.loadingNotifications = false;
      },
      error: (error) => {
        this.loadingNotifications = false;
        console.error('Error loading notifications:', error);
      },
    });
  }

  showNotificationDetail(notif: NotificationDto): void {
    this.selectedNotification = notif;

    // Marcar como leída si no lo está
    if (!notif.leida) {
      this.notificationService.markAsRead(notif.id).subscribe({
        next: () => {
          notif.leida = true;
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        },
      });
    }
  }

  closeNotificationDetail(): void {
    this.selectedNotification = null;
  }
}
