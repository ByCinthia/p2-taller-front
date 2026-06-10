import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro_usuario.component.html',
  styleUrls: ['./registro_usuario.component.css'],
})
export class RegisterComponent {
  step = 1;
  loading = false;
  errorMsg = '';
  showAdminPassword = false;
  private registrationToken: string | null = null;

  readonly empresaForm = this.fb.nonNullable.group({
    empresa_nombre: ['', [Validators.required, Validators.maxLength(100)]],
    empresa_nit: ['', [Validators.required, Validators.maxLength(20)]],
    empresa_email: ['', [Validators.email, Validators.maxLength(254)]],
    empresa_telefono: ['', Validators.maxLength(20)],
    empresa_direccion: ['', Validators.maxLength(255)],
    plan: ['basico', Validators.required],
    card_number: [''],
    card_expiry: [''],
    card_cvc: [''],
  });

  readonly adminForm = this.fb.nonNullable.group({
    admin_username: ['', [Validators.required, Validators.maxLength(100)]],
    admin_password: ['', Validators.required],
    admin_first_name: ['', [Validators.required, Validators.maxLength(100)]],
    admin_last_names: ['', [Validators.required, Validators.maxLength(201)]],
    admin_email: ['', [Validators.required, Validators.email]],
    admin_ci: ['', [Validators.required, Validators.maxLength(20)]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  goToStepTwo(): void {
    if (this.loading) {
      return;
    }
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      return;
    }

    const payment = this.normalizedPayment();
    const hasAnyPayment = Boolean(payment.card_number || payment.card_expiry || payment.card_cvc);
    const hasAllPayment = Boolean(payment.card_number && payment.card_expiry && payment.card_cvc);
    if (hasAnyPayment && !hasAllPayment) {
      this.errorMsg = 'Si envias datos de pago, debes completar tarjeta, vencimiento y CVC.';
      return;
    }

    const empresa = this.empresaForm.getRawValue();
    this.loading = true;
    this.errorMsg = '';
    this.auth.registerCompany({
      empresa_nombre: empresa.empresa_nombre.trim(),
      empresa_nit: empresa.empresa_nit.trim(),
      empresa_email: this.optionalValue(empresa.empresa_email),
      empresa_telefono: this.optionalValue(empresa.empresa_telefono),
      empresa_direccion: this.optionalValue(empresa.empresa_direccion),
      plan: empresa.plan,
      card_number: payment.card_number,
      card_expiry: payment.card_expiry,
      card_cvc: payment.card_cvc,
    }).subscribe({
      next: (result) => {
        this.loading = false;
        this.registrationToken = result.registration_token;
        this.step = 2;
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo registrar la empresa.';
      },
    });
  }

  submit(): void {
    if (this.loading) {
      return;
    }
    if (this.empresaForm.invalid) {
      this.step = 1;
      this.empresaForm.markAllAsTouched();
      return;
    }
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    const payment = this.normalizedPayment();
    const hasAnyPayment = Boolean(payment.card_number || payment.card_expiry || payment.card_cvc);
    const hasAllPayment = Boolean(payment.card_number && payment.card_expiry && payment.card_cvc);
    if (hasAnyPayment && !hasAllPayment) {
      this.errorMsg = 'Si envias datos de pago, debes completar tarjeta, vencimiento y CVC.';
      this.step = 1;
      return;
    }

    const admin = this.adminForm.getRawValue();
    if (!this.registrationToken) {
      this.loading = false;
      this.errorMsg = 'Debes registrar primero la empresa.';
      this.step = 1;
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const surnames = this.splitLastNames(admin.admin_last_names);

    this.auth.registerAdmin({
      registration_token: this.registrationToken,
      admin_username: admin.admin_username.trim(),
      admin_password: admin.admin_password,
      admin_first_name: admin.admin_first_name.trim(),
      admin_email: admin.admin_email.trim(),
      admin_ci: admin.admin_ci.trim(),
      admin_apellido_p: surnames.apellidoP,
      admin_apellido_m: surnames.apellidoM,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.registrationToken = null;
        this.router.navigate(['/app/empleados']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo completar el registro.';
      },
    });
  }

  toggleAdminPassword(): void {
    this.showAdminPassword = !this.showAdminPassword;
  }

  private splitLastNames(fullLastNames: string): { apellidoP: string; apellidoM: string } {
    const normalized = fullLastNames.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      return { apellidoP: '', apellidoM: '' };
    }

    const [apellidoP, ...rest] = normalized.split(' ');
    return {
      apellidoP: apellidoP.slice(0, 100),
      apellidoM: rest.join(' ').slice(0, 100),
    };
  }

  private optionalValue(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private normalizedPayment(): { card_number: string | null; card_expiry: string | null; card_cvc: string | null } {
    const payment = this.empresaForm.getRawValue();
    const cardNumber = payment.card_number.trim();
    const cardExpiry = payment.card_expiry.trim();
    const cardCvc = payment.card_cvc.trim();

    return {
      card_number: cardNumber || null,
      card_expiry: cardExpiry || null,
      card_cvc: cardCvc || null,
    };
  }
}
