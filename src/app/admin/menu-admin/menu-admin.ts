import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth-service';
import { ModalService } from '../../shared/modal/modal.service';

@Component({
  selector: 'app-menu-admin',
  imports: [RouterLink],
  templateUrl: './menu-admin.html',
  styleUrl: './menu-admin.css',
})
export class MenuAdmin {
  private auth = inject(AuthService);
  private router = inject(Router);
  private modal = inject(ModalService);

  alertaFutura() {
    this.modal.alert({
      title: 'Próximamente',
      message: "La funcionalidad 'Resetear Temporada' estará disponible en una próxima actualización.",
      variant: 'info',
      confirmText: 'Entendido',
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
