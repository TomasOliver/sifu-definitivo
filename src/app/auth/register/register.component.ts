import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service';
import { map, of } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form: FormGroup;
  msg = signal<string>('');
  isSubmitting = signal<boolean>(false);

  constructor() {
    this.form = this.fb.group({
      username: ['', {
        validators: [
          Validators.required,
          Validators.minLength(3)
        ],
        asyncValidators: [this.usernameExisteValidator.bind(this)],
        updateOn: 'change'
      }],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/.*[#?!@$%^&*-].*/)
      ]]
    });
  }
  
  goToLogin() {
    this.router.navigate(['/login']);
  }

  usernameExisteValidator(control: any) { //VALIDACION CREADA POR NOSOTROS PARA NO REPETIR USUARIOS
    const value = (control.value ?? '').trim();
    if (!value) return of(null);
    return this.auth.checkUserExists(value).pipe(
      map(users => {
        return users.length > 0 ? { usuarioExistente: true } : null;
      })
    );
  }

  register() { //"SUBMIT"
    if (this.form.invalid || this.form.pending || this.isSubmitting()) return;
    const rawUsername = (this.form.value.username ?? '').trim();
    const password = this.form.value.password ?? '';

    this.isSubmitting.set(true);
    this.msg.set('');

    this.auth.register(rawUsername, password).subscribe({
      next: () => {
        this.msg.set('Usuario creado con éxito');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.msg.set(typeof err === 'string' ? err : 'Error al registrar usuario');
      }
    });
  }
}