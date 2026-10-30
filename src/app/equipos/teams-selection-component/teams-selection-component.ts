import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { Teams } from '../../models/teams';
import { TeamsService } from '../teams-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../menu-jugar/game-state-service';
import { generateFixture } from '../../utils/generate-fixture';
import { AuthService } from '../../auth/auth-service';
import { SavesService } from '../../lista-partidas-guardadas/saves-service';
import { Saves } from '../../models/saves';


@Component({
  selector: 'app-teams-selection-component',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './teams-selection-component.html',
  styleUrl: './teams-selection-component.css',
})
export class TeamsSelectionComponent {
  ///servicios
  private readonly service = inject(TeamsService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute);
  private readonly teamId = Number(this.route.snapshot.paramMap.get('id'));
  private readonly gameState = inject(GameStateService);
  private readonly auth = inject(AuthService);

  protected saveName: string | null = null;

  private readonly savesService = inject(SavesService);

  

  constructor() {
   this.saveName = this.route.snapshot.queryParamMap.get('saveName');
    // guardamos en una variable temporal o signal para usarlo cuando el usuario elija el equipo
  }

  //obtencion de datos 
  protected readonly teamsSource = toSignal(this.service.getAllTeams())
  protected readonly teams = computed(() => this.teamsSource() ?? []);

  ///validaciones
  protected readonly isLoading = computed(() => this.teamsSource() === undefined)

  //filtrado
  protected searchTerm = signal<string>('');
  protected isCreatingSave = signal<boolean>(false);

  protected readonly filteredTeams = computed(() => {
    const teams = this.teamsSource() ?? [];
    const term = this.searchTerm().toLowerCase();
    if (!term) return teams; // si no escribio nada, devuelve todo
    return teams.filter(team =>  //filtra por nombre completo o abreviatura 
      team.name.toLowerCase().includes(term) ||
      team.shortName.toLowerCase().includes(term)
    );
  });

private inicializarPartida(equipoSeleccionado: Teams) {
    if (this.isCreatingSave()) return;

    const currentUser = this.auth.getUser();
    const todosLosEquipos = this.teamsSource(); 

    if (!currentUser) {
      alert('Error: Debes iniciar sesión para crear una partida.');
      this.router.navigate(['/login']);
      return;
    }
    if (!todosLosEquipos) {
      alert('Error: Los equipos aún no han cargado.');
      return;
    }

    this.isCreatingSave.set(true);

    // generamos el Fixture usando tu utilidad
    // usamos una copia para generar el fixture para no mutar el original todavía
    const equiposParaFixture = JSON.parse(JSON.stringify(todosLosEquipos));
    const nuevoFixture = generateFixture(equiposParaFixture);

    // construimos el objeto Save
    const nuevaPartida: Saves = {
      id: String(Date.now()),
      userId: String(currentUser.id),
      teamId: equipoSeleccionado.id,
      nameSave: this.saveName!, 
      
      currentMatchday: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      standings: this.gameState.createInitialStandings(equiposParaFixture), 
      
      
      fixture: nuevoFixture, 
      
      // clonamos los equipos para que esta partida tenga sus propios jugadores
      modifiedTeams: JSON.parse(JSON.stringify(todosLosEquipos)),
      transferAttemptsLeft: 10,
      transferHistory: []
    };

    this.savesService.createSave(nuevaPartida).subscribe({
      next: (saveCreado) => {
        this.isCreatingSave.set(false);
        this.gameState.loadSave(saveCreado);
        this.router.navigate(['/inicio', saveCreado.teamId]);
      },
      error: (err) => {
        this.isCreatingSave.set(false);
        console.error('Error al crear partida:', err);
        alert('Hubo un error al guardar la partida. Intenta nuevamente.');
      }
    });
  }

  onTeamClick(equipo: Teams) {
    if (this.saveName) {
      // MODO CREAR PARTIDA
        this.inicializarPartida(equipo);
    } else {
      // MODO VER PLANTEL (Solo ver)
      this.navigateToPlantel(equipo.id);
    }
  }

  navigateToPlantel(id: number) {
    this.router.navigateByUrl(`/listaTeams/${id}`);
  }

  getTeamLogo(teamId: number): string {
    return `/logos/${teamId}.png`;
  }

  handleMissingImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '/logos/default.png';
  }
}


