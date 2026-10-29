import { Component } from '@angular/core';
import { AuthService } from '../auth-service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
  error = false;

  constructor(private auth: AuthService, private router: Router) { }

  onSubmit() {
    if (!this.username || !this.password) { // solo continuo con el login si tengo ambos campos
      this.error = true;
      return;
    }

    this.auth.login(this.username, this.password).subscribe(res => {
      if (res) {
        if (res.role === 'admin') {
          this.router.navigate(['/menuAdmin']);
        } else {
          this.router.navigate(['/menu']);
        }
      } else {
        this.error = true;
      }
    });
  }
  goToRegister() {
    this.router.navigate(['/register']);
  }
}