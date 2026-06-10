import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

import { AuthService } from '../../services/auth/auth.service';
import { NotificationService, type NotificationDto } from '../../services/notification.service';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './notificaciones_admin.component.html',
  styleUrls: ['./notificaciones_admin.component.css'],
})
export class AdminNotificationsComponent implements OnInit {
  notifications: NotificationDto[] = [];
  selectedNotification: NotificationDto | null = null;
  loadingNotifications = false;
  errorMsg = '';

  constructor(
    public readonly auth: AuthService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.errorMsg = '';
    this.loadingNotifications = true;

    this.notificationService.getMyNotifications().subscribe({
      next: (notifs) => {
        this.notifications = notifs;
        this.loadingNotifications = false;
      },
      error: (error) => {
        this.loadingNotifications = false;
        this.errorMsg = error?.error?.detail || 'No se pudieron cargar las notificaciones.';
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
