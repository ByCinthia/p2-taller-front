import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';

import { AuthService } from '../../services/auth/auth.service';
import { ClienteApiService } from '../../services/cliente.service';
import { IncidenteApiService, IncidenteCreateRequest } from '../../services/incidente.service';
import { NotificationService, type NotificationDto } from '../../services/notification.service';
import type { ClienteDto, VehiculoDto } from '../../services/cliente.service';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil_cliente.component.html',
  styleUrls: ['./perfil_cliente.component.css'],
})
export class ClientProfileComponent implements OnInit {

  cliente: ClienteDto | null = null;
  vehiculos: VehiculoDto[] = [];
  selectedVehicle: VehiculoDto | null = null;
  loadingVehiculos = false;
  loadingSolicitudes = false;
  savingProfile = false;
  editingProfile = false;
  showVehicleForm = false;
  activeSection: 'perfil' | 'vehiculos' | 'notificaciones' | 'solicitud' | 'seguimiento' = 'perfil';
  errorMsg = '';
  misSolicitudes: any[] = [];
  notifications: NotificationDto[] = [];
  selectedNotification: NotificationDto | null = null;
  loadingNotifications = false;

  profileForm = {
    nombre: '',
    username: '',
    email: '',
    telefono: '',
  };

  newVehiculo: Partial<VehiculoDto> = {
    marca: '',
    modelo: '',
    placa: '',
    anio: undefined,
  };

  // --- Solicitud de auxilio state
  createForm: IncidenteCreateRequest = {
    vehiculo_id: undefined,
    tipo: '',
    descripcion: '',
    latitud: undefined,
    longitud: undefined,
  };
  submitting = false;

  get mapUrl() {
    const lat = this.createForm.latitud ?? 0;
    const lon = this.createForm.longitud ?? 0;
    const q = encodeURIComponent(`${lat},${lon}`);
    return `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
  }

  constructor(
    public readonly auth: AuthService,
    private readonly clienteApi: ClienteApiService,
    private readonly incidenteApi: IncidenteApiService,
    private readonly notificationService: NotificationService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Detectar el parámetro "tab" en la URL y abrir la pestaña correspondiente
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'seguimiento') {
        this.activeSection = 'seguimiento';
      } else if (tab === 'notificaciones') {
        this.setSection('notificaciones');
      }
    });

    this.clienteApi.getMe().subscribe({
      next: (cliente) => {
        this.cliente = cliente;
        this.profileForm = {
          nombre: cliente.nombre || '',
          username: this.auth.currentUser?.username || cliente.username || '',
          email: cliente.email || this.auth.currentUser?.email || '',
          telefono: cliente.telefono || '',
        };
      },
      error: (error) => (this.errorMsg = error?.error?.detail || 'No se pudo cargar el perfil de cliente.'),
    });
    this.loadVehiculos();
    this.cargarSolicitudes();
  }

  setSection(section: 'perfil' | 'vehiculos' | 'notificaciones' | 'solicitud' | 'seguimiento'): void {
    this.activeSection = section;
    if (section === 'seguimiento') {
      this.cargarSolicitudes();
    } else if (section === 'notificaciones') {
      this.loadNotifications();
    }
  }

  loadVehiculos(): void {
    this.loadingVehiculos = true;
    this.clienteApi.listMyVehiculos().subscribe({
      next: (vehiculos) => {
        this.vehiculos = vehiculos || [];
        if (!this.selectedVehicle && this.vehiculos.length > 0) {
          this.selectedVehicle = this.vehiculos[0];
        }
        this.loadingVehiculos = false;
      },
      error: (error) => {
        this.loadingVehiculos = false;
        this.errorMsg = error?.error?.detail || 'No se pudieron cargar los vehiculos.';
      },
    });
  }

  selectVehicle(vehiculo: VehiculoDto): void {
    this.selectedVehicle = vehiculo;
    this.activeSection = 'vehiculos';
  }

  saveProfile(): void {
    this.savingProfile = true;
    this.errorMsg = '';

    this.clienteApi.updateMe({
      nombre: this.profileForm.nombre.trim(),
      username: this.profileForm.username.trim(),
      email: this.profileForm.email.trim() || undefined,
      telefono: this.profileForm.telefono.trim() || undefined,
    }).subscribe({
      next: (updated) => {
        this.cliente = updated;
        this.savingProfile = false;
        this.editingProfile = false;
      },
      error: (error) => {
        this.savingProfile = false;
        this.errorMsg = error?.error?.detail || 'No se pudo actualizar tu perfil.';
      },
    });
  }

  createVehiculo(): void {
    if (!this.newVehiculo.marca || !this.newVehiculo.modelo || !this.newVehiculo.placa) {
      this.errorMsg = 'Marca, modelo y placa son requeridos.';
      return;
    }

    this.loadingVehiculos = true;
    this.clienteApi.createMyVehiculo(this.newVehiculo).subscribe({
      next: () => {
        this.newVehiculo = { marca: '', modelo: '', placa: '', anio: undefined };
        this.showVehicleForm = false;
        this.loadVehiculos();
      },
      error: (error) => {
        this.loadingVehiculos = false;
        this.errorMsg = error?.error?.detail || 'No se pudo registrar el vehiculo.';
      },
    });
  }

  setPrincipal(vehiculo: VehiculoDto): void {
    this.clienteApi.setPrincipal(vehiculo.id).subscribe({
      next: () => this.loadVehiculos(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo marcar el vehiculo como principal.';
      },
    });
  }

  removeVehiculo(vehiculo: VehiculoDto): void {
    if (!window.confirm(`Eliminar vehículo ${vehiculo.placa || vehiculo.id}?`)) {
      return;
    }

    this.clienteApi.deleteVehiculo(vehiculo.id).subscribe({
      next: () => {
        if (this.selectedVehicle?.id === vehiculo.id) {
          this.selectedVehicle = null;
        }
        this.loadVehiculos();
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar el vehiculo.';
      },
    });
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.errorMsg = 'Geolocalización no disponible';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.createForm.latitud = pos.coords.latitude;
        this.createForm.longitud = pos.coords.longitude;
      },
      () => (this.errorMsg = 'No se pudo obtener tu ubicación'),
    );
  }

  submitSolicitud(): void {
    if (!this.createForm.tipo) {
      this.errorMsg = 'Selecciona el tipo de incidente';
      return;
    }
    if (this.createForm.latitud == null || this.createForm.longitud == null) {
      this.errorMsg = 'Indica la ubicación en el mapa o usa tu ubicación';
      return;
    }
    this.submitting = true;
    this.incidenteApi.create(this.createForm).subscribe({
      next: () => {
        this.submitting = false;
        this.createForm = { vehiculo_id: undefined, tipo: '', descripcion: '', latitud: undefined, longitud: undefined };
        this.errorMsg = '';
        // navigate to incidents or just notify
        alert('Solicitud creada correctamente');
      },
      error: (err: any) => {
        this.submitting = false;
        this.errorMsg = err?.error?.detail || 'Error al crear la solicitud';
      },
    });
  }

  cargarSolicitudes(): void {
    this.loadingSolicitudes = true;
    this.incidenteApi.list().subscribe({
      next: (data) => {
        this.misSolicitudes = data || [];
        this.loadingSolicitudes = false;
      },
      error: (err: any) => {
        this.loadingSolicitudes = false;
        this.errorMsg = err?.error?.detail || 'Error al cargar solicitudes';
      },
    });
  }

  abrirMapa(solicitud: any): void {
    if (!solicitud.latitud || !solicitud.longitud) {
      this.errorMsg = 'La solicitud no tiene ubicación';
      return;
    }
    const url = `https://maps.google.com/?q=${solicitud.latitud},${solicitud.longitud}`;
    window.open(url, '_blank');
  }

  verDetalleTracking(solicitud: any): void {
    // Navegar a la página de tracking del incidente
    window.location.href = `/app/incidentes/tracking/${solicitud.id}`;
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