import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contenedor_toast.component.html',
  styleUrls: ['./contenedor_toast.component.css'],
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private destroy$ = new Subject<void>();

  constructor(private readonly toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService
      .getToasts()
      .pipe(takeUntil(this.destroy$))
      .subscribe((toasts) => {
        this.toasts = toasts;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClose(id: string): void {
    this.toastService.remove(id);
  }

  onActionClick(toast: Toast): void {
    if (toast.action) {
      toast.action.callback();
      this.toastService.remove(toast.id);
    }
  }
}
