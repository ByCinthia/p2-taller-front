import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ClienteApiService } from '../../services/cliente.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-cliente-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './crear_cliente.component.html',
  styleUrls: ['./crear_cliente.component.css'],
})
export class ClienteCreateComponent {
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    password_confirm: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.maxLength(30)]],
    activo: [true],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ClienteApiService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  isInvalid(control: 'nombre' | 'username' | 'password' | 'email' | 'telefono'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  get passwordMismatch(): boolean {
    const password = this.form.controls.password.value;
    const confirm = this.form.controls.password_confirm.value;
    if (!confirm) {
      return false;
    }
    return password !== confirm;
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    if (this.form.invalid || this.passwordMismatch) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre.trim(),
      username: raw.username.trim(),
      password: raw.password,
      email: this.optional(raw.email),
      telefono: this.optional(raw.telefono),
      activo: !!raw.activo,
    };

    this.loading = true;
    this.errorMsg = '';

    this.api.create(payload).subscribe({
      next: (tokens) => {
        (this.authService as unknown as { applyTokens: (value: { access: string; refresh: string }) => void }).applyTokens(tokens);

        this.authService.loadMyPermissions().subscribe({
          next: () => {
            this.api.getMe().subscribe({
              next: (created) => {
                this.loading = false;
                this.router.navigate(['/app/clientes', created.id]);
              },
              error: (error) => {
                this.loading = false;
                this.errorMsg = error?.error?.detail || 'No se pudo recuperar el cliente recién registrado.';
              },
            });
          },
          error: () => {
            this.loading = false;
            this.errorMsg = 'Cliente registrado, pero no se pudo iniciar la sesión.';
          },
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo registrar el cliente.';
      },
    });
  }

  private optional(value: string): string | undefined {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }
}
