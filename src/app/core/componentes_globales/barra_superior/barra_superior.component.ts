import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barra_superior.component.html',
  styleUrls: ['./barra_superior.component.css'],
})
export class TopbarComponent {
  readonly unreadCount$ = this.notificationService.unreadCount$;

  constructor(
    public readonly auth: AuthService,
    private readonly notificationService: NotificationService,
    private readonly router: Router
  ) {}

  verNotificaciones(): void {
    if (this.auth.isAdmin) {
      this.router.navigate(['/app/admin/notificaciones']);
    } else if (this.auth.isClient) {
      this.router.navigate(['/app/cliente/perfil'], { queryParams: { tab: 'notificaciones' } });
    } else {
      this.router.navigate(['/app/empleado/perfil']);
    }
  }
}
