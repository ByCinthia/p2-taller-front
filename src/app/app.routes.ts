import { Routes } from '@angular/router';
import { authGuard } from './core/guardias/autenticacion.guardia';
import { HomeComponent } from './features/auth/inicio/inicio.component';
import { LoginComponent } from './features/auth/iniciar_sesion/iniciar_sesion.component';
import { RegisterComponent } from './features/auth/registro_usuario/registro_usuario.component';
import { ActivateInviteComponent } from './features/auth/activar_invitacion/activar_invitacion.component';
import { MainLayoutComponent } from './core/layouts/diseno_principal/diseno_principal.component';
import { EmpleadoComponent } from './features/administrador/empleados/empleados.component';
import { EmpleadoPanelComponent } from './features/empleado/empresas/sucursales/auxilio_mecanico/panel_operativo/panel_operativo.component';
import { CargoComponent } from './features/administrador/catalogos/cargos/cargos.component';
import { RolComponent } from './features/administrador/catalogos/roles/roles.component';
import { PermisoComponent } from './features/administrador/catalogos/permisos/permisos.component';
import { ClientesComponent } from './features/administrador/clientes/clientes.component';
import { ClienteCreateComponent } from './features/clientes/crear_cliente/crear_cliente.component';
import { ClienteDetailComponent } from './features/clientes/detalle_cliente/detalle_cliente.component';
import { VehiculosComponent } from './features/administrador/vehiculos/vehiculos.component';
import { IncidentesComponent } from './features/administrador/gestion_incidentes/gestion_incidentes.component';
import { IncidentesComponent as SolicitudIncidentesComponent } from './features/empleado/empresas/sucursales/auxilio_mecanico/solicitud_incidentes/solicitud_incidentes.component';
import { AsignacionesEmpleadoComponent } from './features/empleado/empresas/sucursales/auxilio_mecanico/asignaciones/asignaciones_empleado.component';
import { ServicioComponent } from './features/administrador/catalogos/servicios/servicios.component';
import { UbicacionTallerComponent } from './features/administrador/ubicacion_taller/ubicacion_taller.component';
import { PagosComponent } from './features/administrador/pagos/pagos.component';
import { ReportesComponent } from './features/administrador/reportes/reportes.component';
import { ConfiguracionComponent } from './features/administrador/configuracion/configuracion.component';
import { AdminProfileComponent } from './features/administrador/perfil_admin/perfil_admin.component';
import { AdminNotificationsComponent } from './features/administrador/notificaciones_admin/notificaciones_admin.component';
import { AdminSolicitudesPendientesComponent } from './features/administrador/solicitudes/pendientes/solicitudes_pendientes.component';
import { AdminSolicitudesAsignadasComponent } from './features/administrador/solicitudes/asignadas/solicitudes_asignadas.component';
import { AdminSolicitudesEnProcesoComponent } from './features/administrador/solicitudes/en_proceso/solicitudes_en_proceso.component';
import { AdminSolicitudesAtendidasComponent } from './features/administrador/solicitudes/atendidas/solicitudes_atendidas.component';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'activate-invite', component: ActivateInviteComponent },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'incidentes' },
      { path: 'empleado/perfil', component: EmpleadoPanelComponent },
      { path: 'empleado/asignaciones', component: AsignacionesEmpleadoComponent },
      { path: 'empleados/nuevo', component: EmpleadoComponent },
      { path: 'empleados', component: EmpleadoComponent },
      { path: 'cargos/nuevo', component: CargoComponent },
      { path: 'cargos', component: CargoComponent },
      { path: 'servicios/nuevo', component: ServicioComponent },
      { path: 'servicios', component: ServicioComponent },
      { path: 'roles/nuevo', component: RolComponent },
      { path: 'roles', component: RolComponent },
      { path: 'permisos/nuevo', component: PermisoComponent },
      { path: 'permisos', component: PermisoComponent },
      { path: 'clientes/nuevo', component: ClienteCreateComponent },
      { path: 'clientes/:id', component: ClienteDetailComponent },
      { path: 'clientes', component: ClientesComponent },
      {
        path: 'cliente/perfil',
        loadComponent: () =>
          import('./features/clientes/perfil_cliente/perfil_cliente.component').then((m) => m.ClientProfileComponent),
      },
      {
        path: 'cliente/historial',
        loadComponent: () =>
          import('./features/clientes/historial_solicitudes/historial_solicitudes.component').then((m) => m.IncidentHistoryComponent),
      },
      { path: 'vehiculos', component: VehiculosComponent },
      { path: 'incidentes', component: IncidentesComponent },
      { path: 'incidentes/lista', component: IncidentesComponent },
      { path: 'asignaciones', component: AsignacionesEmpleadoComponent },
      { path: 'admin/perfil', component: AdminProfileComponent },
      { path: 'admin/notificaciones', component: AdminNotificationsComponent },
      { path: 'admin/solicitudes', component: SolicitudIncidentesComponent },
      { path: 'admin/solicitudes/pendientes', component: AdminSolicitudesPendientesComponent },
      { path: 'admin/solicitudes/asignadas', component: AdminSolicitudesAsignadasComponent },
      { path: 'admin/solicitudes/en-proceso', component: AdminSolicitudesEnProcesoComponent },
      { path: 'admin/solicitudes/atendidas', component: AdminSolicitudesAtendidasComponent },
      { path: 'taller/ubicacion', component: UbicacionTallerComponent },
      { path: 'taller/pagos', component: PagosComponent },
      { path: 'taller/reportes', component: ReportesComponent },
      { path: 'taller/configuracion', component: ConfiguracionComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
