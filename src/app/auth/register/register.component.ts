import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service';
import { map } from 'rxjs';

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
  msg = '';

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
    return this.auth.checkUserExists(control.value).pipe(
      map(users => {
        return users.length > 0 ? { usuarioExistente: true } : null;
      })
    );
  }

  register() { //"SUBMIT"
    const { username, password } = this.form.value; 

    this.auth.register(username, password).subscribe({
      next: () => {
        this.msg = 'Usuario creado con éxito';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.msg = err;
      }
    });
  }
}