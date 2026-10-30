import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth-service';
import { Router, RouterLink } from '@angular/router';
import { Users } from '../models/users';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../menu-jugar/game-state-service';
import { ModalService } from '../shared/modal/modal.service';

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
  private gameState = inject(GameStateService);
  private modal = inject(ModalService);

  isModalOpen = signal(false);
  newSaveName = signal('');

  user: Users | null = null;

  constructor() {
    // Obtenemos el usuario desde el servicio al cargar el componente
    this.user = this.auth.getUser();
  }

  logout() {
    this.gameState.clearActiveGame();
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
      this.modal.alert({
        title: 'Nombre requerido',
        message: 'Por favor escribí un nombre para identificar tu nueva partida antes de continuar.',
        variant: 'warning',
        confirmText: 'Entendido',
      });
      return;
    }

    this.router.navigate(['/listaTeams'], {
      queryParams: { saveName: this.newSaveName() }
    });
  }


}