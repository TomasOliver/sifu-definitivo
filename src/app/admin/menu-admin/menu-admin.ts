import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'app-menu-admin',
  imports: [RouterLink],
  templateUrl: './menu-admin.html',
  styleUrl: './menu-admin.css',
})
export class MenuAdmin {
  private auth = inject(AuthService);
  private router = inject(Router);

  alertaFutura() {
    alert("Funcionalidad 'Resetear Temporada' próximamente...");
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
