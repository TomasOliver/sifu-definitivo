import { Component, signal } from '@angular/core';
import { AuthService } from '../auth-service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Users } from '../../models/users';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  error = signal(false);
  showPassword = signal(false);
  loginSuccess = signal(false);
  loggedUser = signal<Users | null>(null);
  isLoading = signal(false);

  constructor(private auth: AuthService, private router: Router) { }

  onSubmit() {
    const cleanUsername = this.username.trim();
    if (!cleanUsername || !this.password) { // solo continuo con el login si tengo ambos campos
      this.error.set(true);
      return;
    }

    this.error.set(false);
    this.isLoading.set(true);

    this.auth.login(cleanUsername, this.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res) {
          this.loggedUser.set(res);
          this.loginSuccess.set(true);
        } else {
          this.error.set(true);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set(true);
      }
    });
  }

  continueToApp() {
    if (this.loggedUser()?.role === 'admin') {
      this.router.navigate(['/menuAdmin']);
    } else {
      this.router.navigate(['/menu']);
    }
  }

  clearUsername() {
    this.username = '';
    this.error.set(false);
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
