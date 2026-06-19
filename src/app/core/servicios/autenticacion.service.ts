import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { environment } from '../../../environments/environment';
import {
  DecodedToken,
  EmployeeInvitationActivateRequest,
  LoginRequest,
  RegisterAdminRequest,
  RegisterCompanyRequest,
  RegisterCompanyResponse,
  RegisterEmpresaRequest,
  TokenResponse,
} from '../modelos/autenticacion.modelos';
import { PushNotificationService } from './notificaciones_push.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly refreshKey = 'refresh';

  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly decodedTokenSubject = new BehaviorSubject<DecodedToken | null>(null);
  private readonly permissionsSubject = new BehaviorSubject<string[]>([]);
  private readonly authLoadedSubject = new BehaviorSubject<boolean>(false);

  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly decodedToken$ = this.decodedTokenSubject.asObservable();
  readonly permissions$ = this.permissionsSubject.asObservable();
  readonly authLoaded$ = this.authLoadedSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly pushNotificationService: PushNotificationService,
  ) {
    this.restoreSession();
  }

  get isAuthLoaded(): boolean {
    return this.authLoadedSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get refresh(): string | null {
    return localStorage.getItem(this.refreshKey);
  }

  get currentUser(): DecodedToken | null {
    return this.decodedTokenSubject.value;
  }

  get currentPermissions(): string[] {
    return this.permissionsSubject.value;
  }

  login(payload: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/token/`, payload).pipe(
      tap((tokens) => {
        this.applyTokens(tokens);
        console.log('[AUTH] Usuario cargado');
        console.log('[AUTH] Roles cargados');
      }),
      switchMap((tokens) =>
        this.loadMyPermissions().pipe(
          switchMap(() => {
            console.log('[AUTH] Permisos cargados');
            this.registerPushNotificationsForCurrentUser();
            return of(tokens);
          })
        )
      ),
    );
  }

  register(payload: RegisterEmpresaRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/register/`, payload).pipe(
      tap((tokens) => this.applyTokens(tokens)),
      switchMap((tokens) =>
        this.loadMyPermissions().pipe(
          switchMap(() => {
            this.registerPushNotificationsForCurrentUser();
            return of(tokens);
          })
        )
      ),
    );
  }

  registerCompany(payload: RegisterCompanyRequest): Observable<RegisterCompanyResponse> {
    return this.http.post<RegisterCompanyResponse>(`${environment.apiBaseUrl}/register/company/`, payload);
  }

  registerAdmin(payload: RegisterAdminRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/register/admin/`, payload).pipe(
      tap((tokens) => this.applyTokens(tokens)),
      switchMap((tokens) =>
        this.loadMyPermissions().pipe(
          switchMap(() => {
            this.registerPushNotificationsForCurrentUser();
            return of(tokens);
          })
        )
      ),
    );
  }

  activateEmployeeInvitation(payload: EmployeeInvitationActivateRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/employee-invitations/activate/`, payload).pipe(
      tap((tokens) => this.applyTokens(tokens)),
      switchMap((tokens) =>
        this.loadMyPermissions().pipe(
          switchMap(() => {
            this.registerPushNotificationsForCurrentUser();
            return of(tokens);
          })
        )
      ),
    );
  }

  loadMyPermissions(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiBaseUrl}/my-permissions/`).pipe(
      tap((permissions) => this.permissionsSubject.next(permissions)),
    );
  }

  hasPermission(permissionName: string): boolean {
    const user = this.currentUser;
    if (user?.is_admin) {
      return true;
    }
    return this.currentPermissions.includes(permissionName);
  }

  hasRole(roleName: string): boolean {
    const user = this.currentUser;
    if (!user) {
      return false;
    }
    return (user.roles || []).includes(roleName);
  }

  get isClient(): boolean {
    const user = this.currentUser;
    if (!user) {
      return false;
    }
    return user.role === 'cliente' || (user.roles || []).includes('cliente');
  }

  get isAdmin(): boolean {
    return !!this.currentUser?.is_admin;
  }

  get hasAdminPermission(): boolean {
    return this.hasPermission('manage_empleado') || 
           this.hasPermission('manage_rol') || 
           this.hasPermission('manage_servicio');
  }

  get isEmpleadoTecnico(): boolean {
    const user = this.currentUser;
    if (!user) return false;
    const roleStr = String(user.role || '').toLowerCase();
    const rolesArr = (user.roles || []).map((r: string) => String(r).toLowerCase());
    return roleStr === 'empleado' || roleStr === 'tecnico' || rolesArr.includes('empleado') || rolesArr.includes('tecnico');
  }

  getDefaultAppRoute(): string {
    if (this.isClient) return '/app/cliente/perfil';
    if (this.isEmpleadoTecnico) return '/app/empleado/perfil';
    if (this.isAdmin || this.hasAdminPermission) return '/app/empleados';
    return '/app/empleado/perfil';
  }


  async logout(): Promise<void> {
    try {
      await this.pushNotificationService.clearTokenOnBackend();
    } catch (error) {
      console.error('[AuthService] Error clearing FCM token on logout:', error);
    }

    try {
      await this.logoutFromBackend().toPromise();
    } catch (error) {
      console.error('[AuthService] Error calling backend logout:', error);
    }

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
    this.isAuthenticatedSubject.next(false);
    this.decodedTokenSubject.next(null);
    this.permissionsSubject.next([]);
    this.authLoadedSubject.next(true);
    this.router.navigate(['/login']);
  }

  tryRefreshToken(): Observable<TokenResponse | null> {
    const refresh = this.refresh;
    if (!refresh) {
      return of(null);
    }

    return this.http.post<{ access: string }>(`${environment.apiBaseUrl}/token/refresh/`, { refresh }).pipe(
      tap((data) => {
        this.applyTokens({ access: data.access, refresh });
      }),
      switchMap(() => this.loadMyPermissions()),
      switchMap(() => of({ access: this.token ?? '', refresh })),
    );
  }

  getMe(): Observable<{
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    es_admin: boolean;
    empresa_id: string | null;
    cliente_id: string | null;
    is_active: boolean;
    created_at: string;
  }> {
    return this.http.get<any>(`${environment.apiBaseUrl}/me`);
  }

  logoutFromBackend(): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/logout`, {});
  }

  private restoreSession(): void {
    const token = this.token;
    if (!token) {
      this.authLoadedSubject.next(true);
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp * 1000 <= Date.now()) {
        void this.logout();
        return;
      }

      this.isAuthenticatedSubject.next(true);
      this.decodedTokenSubject.next(decoded);
      console.log('[AUTH] Usuario cargado');
      console.log('[AUTH] Roles cargados');
      this.loadMyPermissions().subscribe({
        next: () => {
          console.log('[AUTH] Permisos cargados');
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            this.registerPushNotificationsForCurrentUser();
          }
          this.authLoadedSubject.next(true);
        },
        error: () => {
          this.permissionsSubject.next([]);
          this.authLoadedSubject.next(true);
        },
      });
    } catch {
      void this.logout();
    }
  }

  private applyTokens(tokens: TokenResponse): void {
    localStorage.setItem(this.tokenKey, tokens.access);
    localStorage.setItem(this.refreshKey, tokens.refresh);

    const decoded = jwtDecode<DecodedToken>(tokens.access);
    this.decodedTokenSubject.next(decoded);
    this.isAuthenticatedSubject.next(true);
  }

  private registerPushNotificationsForCurrentUser(): void {
    console.log('[AuthService] Registering push notifications for user:', this.currentUser?.username);
    void this.pushNotificationService.requestPermission().then((token) => {
      if (token) {
        console.log('[AuthService] FCM token obtained, sending to backend');
        void this.pushNotificationService.sendTokenToBackend(token);
      } else {
        console.log('[AuthService] User denied notification permission or token unavailable');
      }
    });
  }
}
