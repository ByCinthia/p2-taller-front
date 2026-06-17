import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil_admin.component.html',
  styleUrls: ['./perfil_admin.component.css'],
})
export class AdminProfileComponent {
  constructor(public readonly auth: AuthService) {}
}
