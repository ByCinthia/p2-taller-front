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

  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly decodedToken$ = this.decodedTokenSubject.asObservable();
  readonly permissions$ = this.permissionsSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly pushNotificationService: PushNotificationService,
  ) {
    this.restoreSession();
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

  getDefaultAppRoute(): string {
    return this.isClient ? '/app/cliente/perfil' : '/app/empleados';
  }

  async logout(): Promise<void> {
    try {
      await this.pushNotificationService.clearTokenOnBackend();
    } catch (error) {
      console.error('[AuthService] Error clearing FCM token on logout:', error);
    }

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
    this.isAuthenticatedSubject.next(false);
    this.decodedTokenSubject.next(null);
    this.permissionsSubject.next([]);
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

  private restoreSession(): void {
    const token = this.token;
    if (!token) {
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
      this.loadMyPermissions().subscribe({
        next: () => {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            this.registerPushNotificationsForCurrentUser();
          }
        },
        error: () => this.permissionsSubject.next([]),
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
