import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  private idCounter = 0;

  /**
   * Observar los toasts activos
   */
  getToasts(): Observable<Toast[]> {
    return this.toasts$.asObservable();
  }

  /**
   * Mostrar un toast
   */
  show(options: Omit<Toast, 'id'>): string {
    const id = `toast-${++this.idCounter}`;
    const toast: Toast = { ...options, id };

    const current = this.toasts$.value;
    this.toasts$.next([...current, toast]);

    if (toast.duration) {
      setTimeout(() => this.remove(id), toast.duration);
    }

    return id;
  }

  /**
   * Mostrar toast de éxito
   */
  success(title: string, message: string, duration = 3000): string {
    return this.show({ type: 'success', title, message, duration });
  }

  /**
   * Mostrar toast de error
   */
  error(title: string, message: string, duration = 5000): string {
    return this.show({ type: 'error', title, message, duration });
  }

  /**
   * Mostrar toast de información
   */
  info(title: string, message: string, duration = 3000): string {
    return this.show({ type: 'info', title, message, duration });
  }

  /**
   * Mostrar toast de advertencia
   */
  warning(title: string, message: string, duration = 4000): string {
    return this.show({ type: 'warning', title, message, duration });
  }

  /**
   * Mostrar notificación de incidente
   */
  incidentNotification(
    incidentId: string,
    action: { label: string; callback: () => void }
  ): string {
    return this.show({
      type: 'info',
      title: 'Nueva Solicitud de Auxilio',
      message: `Incidente ${incidentId} requiere atención`,
      duration: 0, // No auto-dismiss
      action,
    });
  }

  /**
   * Remover un toast
   */
  remove(id: string): void {
    const current = this.toasts$.value;
    this.toasts$.next(current.filter((t) => t.id !== id));
  }

  /**
   * Remover todos los toasts
   */
  clear(): void {
    this.toasts$.next([]);
  }
}
