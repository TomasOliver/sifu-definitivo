import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router, RouterLink } from '@angular/router';
import { TeamsService } from '../../equipos/teams-service';
import { Player } from '../../models/player';


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

  deletePlayer(player: PlayerRow) {
    if(confirm(`¿Estás seguro de eliminar a ${player.name} del ${player.teamName}?`)) {
      
      this.service.deletePlayerFromTeam(player.teamId, player.id!).subscribe({
        next: () => {
          // Actualizamos la tabla localmente sin recargar todo
          this.allPlayers.update(current => 
            current.filter(p => p.id !== player.id)
          );
          alert('Jugador eliminado.');
        },
        error: (e) => alert('Error al eliminar')
      });
    }
  }

  navigateToFormEdit(){
    this.router.navigateByUrl('/formAgregarJugador/:id')
  }

  


}
