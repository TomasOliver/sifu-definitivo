import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth-service';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../models/users';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './menu-principal.component.html',
  styleUrls: ['./menu-principal.component.css']
})
export class MenuComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  isModalOpen = signal(false);
  newSaveName = signal('');

  user: Users | null = null;

  constructor() {
    // Obtenemos el usuario desde el servicio al cargar el componente
    this.user = this.auth.getUser();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  openNewGameModal() {
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  continueToTeamSelection() {
    if (!this.newSaveName().trim()) {
      alert('Por favor escribe un nombre para la partida');
      return;
    }

    this.router.navigate(['/listaTeams'], {
      queryParams: { saveName: this.newSaveName() }
    });
  }


}