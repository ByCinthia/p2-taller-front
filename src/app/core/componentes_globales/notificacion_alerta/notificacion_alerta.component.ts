import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, timer } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { IncidenteApiService, IncidenteDto } from '../../servicios/incidentes.api.service';

@Component({
  selector: 'app-notification-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificacion_alerta.component.html',
  styleUrls: ['./notificacion_alerta.component.css'],
})
export class NotificationAlertComponent implements OnInit, OnDestroy {
  @Input() incidenteId!: string;
  @Output() close = new EventEmitter<void>();

  private readonly destroy$ = new Subject<void>();
  
  incidente: IncidenteDto | null = null;
  timeLeft = 30;
  progressPercent = 100;
  currentSlide = 0;
  loading = true;
  accepting = false;

  constructor(private readonly api: IncidenteApiService) {}

  ngOnInit(): void {
    if (this.incidenteId) {
      this.loadIncident();
    } else {
      this.closeAlert();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadIncident(): void {
    this.loading = true;
    this.api.get(this.incidenteId).subscribe({
      next: (data) => {
        this.incidente = data;
        this.loading = false;
        this.startCountdown();
      },
      error: (err) => {
        console.error('[NotificationAlert] Error al cargar incidente:', err);
        this.closeAlert();
      }
    });
  }

  private startCountdown(): void {
    timer(0, 1000)
      .pipe(
        take(31),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (val) => {
          this.timeLeft = 30 - val;
          this.progressPercent = (this.timeLeft / 30) * 100;
          if (this.timeLeft === 0) {
            this.closeAlert();
          }
        },
      });
  }

  nextSlide(): void {
    if (this.incidente?.evidencias && this.incidente.evidencias.length > 0) {
      this.currentSlide = (this.currentSlide + 1) % this.incidente.evidencias.length;
    }
  }

  prevSlide(): void {
    if (this.incidente?.evidencias && this.incidente.evidencias.length > 0) {
      this.currentSlide = (this.currentSlide - 1 + this.incidente.evidencias.length) % this.incidente.evidencias.length;
    }
  }

  aceptarSolicitud(): void {
    if (!this.incidente) return;
    this.accepting = true;
    this.api.acceptIncident(this.incidente.id).subscribe({
      next: () => {
        this.accepting = false;
        this.closeAlert();
      },
      error: (err) => {
        console.error('[NotificationAlert] Error al aceptar la solicitud:', err);
        this.accepting = false;
        this.closeAlert();
      }
    });
  }

  closeAlert(): void {
    this.close.emit();
  }
}
