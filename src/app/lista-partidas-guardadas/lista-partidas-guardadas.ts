import { Component, inject, signal } from '@angular/core';
import { SavesService } from './saves-service';
import { TeamsService } from '../equipos/teams-service';
import { AuthService } from '../auth/auth-service';
import { Router, RouterLink } from '@angular/router';
import { Saves } from '../models/saves';
import { CommonModule, DatePipe } from '@angular/common';
import { GameStateService } from '../menu-jugar/game-state-service';

@Component({
  selector: 'app-lista-partidas-guardadas',
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './lista-partidas-guardadas.html',
  styleUrl: './lista-partidas-guardadas.css',
})

export class ListaPartidasGuardadas {
  private savesService = inject(SavesService);
  private teamsService = inject(TeamsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private gameState = inject(GameStateService);

  // signals para el estado
  saves = signal<Saves[]>([]);
  isLoading = signal<boolean>(true);
  
  // mapa para traducir ID al nombre de equipo 
  teamsMap = signal<Map<number, string>>(new Map());

  constructor() {
    const userId = this.authService.getUser()?.id;

    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    // cargamos los Equipos primero 
    this.teamsService.getAllTeams().subscribe(teams => {
      // creamos el mapa de nombres
      const mapa = new Map<number, string>();
      teams.forEach(t => mapa.set(Number(t.id), t.name));
      this.teamsMap.set(mapa);

      //ahora cargamos las partidas del usuario
      this.cargarPartidas(userId);
    });
  }

  private cargarPartidas(userId: string | number) {
    this.savesService.getSavesByUserId(userId).subscribe({
      next: (data) => {
        // ordenamos para que la ultima modificada salga primero
        const ordenadas = data.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.saves.set(ordenadas);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  
  getTeamName(teamId: number): string {
    return this.teamsMap().get(Number(teamId)) || 'Equipo Desconocido';
  }
  
 
  getTeamLogo(teamId: number): string {
    return `/logos/${teamId}.png`; 
  }

  handleMissingImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.onerror = null;
    imgElement.src = '/logos/default.png';
  }

  continuarPartida(save: Saves) {
    this.gameState.loadSave(save);
    this.router.navigate(['/inicio', save.teamId]);
  }

  eliminarPartida(save: Saves) {
    const confirmacion = confirm(`¿Seguro que deseas eliminar la partida "${save.nameSave}"?`);

    if (!confirmacion) return;

    this.savesService.deleteSave(save.id).subscribe({
      next: () => {
        // quitar la partida eliminada del signal
        this.saves.update(lista => lista.filter(s => String(s.id) !== String(save.id)));
        if (String(this.gameState.currentSave()?.id) === String(save.id)) {
          this.gameState.clearActiveGame();
        }
        console.log("Partida eliminada correctamente:", save.id);
      },
      error: (err) => {
        console.error("Error al eliminar partida", err);
        alert("Hubo un error al eliminar la partida.");
      }
    });
  }

}
