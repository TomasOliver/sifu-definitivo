import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router, RouterLink } from '@angular/router';
import { TeamsService } from '../../equipos/teams-service';
import { Player } from '../../models/player';
import { ModalService } from '../../shared/modal/modal.service';


interface PlayerRow extends Player {
  teamName: string;
  teamId: number;
}

@Component({
  selector: 'app-manage-db',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-db.html',
  styleUrl: './manage-db.css',
})
export class ManageDB {

  private readonly service = inject(TeamsService)
  private readonly router = inject(Router)
  private readonly modal = inject(ModalService);

  searchTerm = signal('');

  // Signal que guarda TODOS los jugadores de la DB aplanados
  allPlayers = signal<PlayerRow[]>([]);

  // Signal computada filtra la lista segun lo que escribas en el buscador
  filteredPlayers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.allPlayers().filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.teamName.toLowerCase().includes(term)
    );
  });

  constructor() {
    this.loadDatabase();
  }

  

  loadDatabase() {
    this.service.getAllTeams().subscribe(teams => {
      const flatList: PlayerRow[] = [];
      
      teams.forEach(team => {
        team.squad.forEach(player => {
          flatList.push({
            ...player,
            teamName: team.name,
            teamId: team.id
          });
        });
      });

      this.allPlayers.set(flatList);
    });
  }

  async deletePlayer(player: PlayerRow) {
    const confirmado = await this.modal.confirm({
      title: 'Eliminar jugador',
      message: `¿Estás seguro de eliminar a ${player.name} del ${player.teamName}?`,
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });

    if (confirmado) {
      
      this.service.deletePlayerFromTeam(player.teamId, player.id!).subscribe({
        next: () => {
          // Actualizamos la tabla localmente sin recargar todo
          this.allPlayers.update(current => 
            current.filter(p => p.id !== player.id)
          );
          this.modal.alert({
            title: 'Jugador eliminado',
            message: `${player.name} fue eliminado de la base de datos correctamente.`,
            variant: 'success',
            confirmText: 'Aceptar',
          });
        },
        error: () => {
          this.modal.alert({
            title: 'Error al eliminar',
            message: 'No se pudo eliminar al jugador. Intentá nuevamente.',
            variant: 'error',
            confirmText: 'Aceptar',
          });
        }
      });
    }
  }

  navigateToFormEdit(){
    this.router.navigateByUrl('/formAgregarJugador/:id')
  }

  


}
