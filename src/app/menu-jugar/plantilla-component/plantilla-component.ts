import { Component, computed, inject, signal } from '@angular/core';
import { TeamsService } from '../../equipos/teams-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { Teams } from '../../models/teams';
import { Player } from '../../models/player';
import { GameStateService } from '../game-state-service';

const VALID_FORMATIONS = [
  '3-4-3', '3-5-2',
  '4-2-4', '4-3-3', '4-4-2', '4-5-1',
  '5-2-3', '5-3-2', '5-4-1'
];

@Component({
  selector: 'app-plantilla-component',
  imports: [RouterLink],
  templateUrl: './plantilla-component.html',
  styleUrl: './plantilla-component.css',
})
export class PlantillaComponent {
  //servicios y rutas
  private readonly service = inject(TeamsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly gameState = inject(GameStateService);

  //id del equipo seleccionado
  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));

  //signal del equipo y isLoading (leído del estado de la partida actual)
  public readonly team = computed(() => this.gameState.getTeamById(this.teamId));
  public readonly squad = computed(() => this.team()?.squad ?? []);
  public readonly isLoading = computed(() => this.team() === undefined);

  //location para el boton de volver
  private readonly location = inject(Location);

  // mostrar errores de tactica
  errorMessage = signal<string | null>(null);

  


  //signals para formacion
  currentFormation = computed(() => {
    const df = this.titulares().filter(p => p.position === 'DF').length;
    const mf = this.titulares().filter(p => p.position === 'MF').length;
    const fw = this.titulares().filter(p => p.position === 'FW').length;
    return `${df}-${mf}-${fw}`; // retorna formacion
  });

  //signals para visualizacion en "campito"
  viewGK = computed(() => this.titulares().filter(p => p.position === 'GK'));
  viewDF = computed(() => this.titulares().filter(p => p.position === 'DF'));
  viewMF = computed(() => this.titulares().filter(p => p.position === 'MF'));
  viewFW = computed(() => this.titulares().filter(p => p.position === 'FW'));

  constructor() {
  }

  titulares = computed(() =>
    this.ordenarPorPosicion(this.squad().filter(p => p.isStarter))
  );

  suplentes = computed(() =>
    this.ordenarPorPosicion(this.squad().filter(p => !p.isStarter))
  );

  jugadorSeleccionado: Player | null = null;

  cambiarJugador(titular: Player, suplente: Player) {
    this.errorMessage.set(null);
    // Validamos solo si cambian de posición
    if (titular.position !== suplente.position) {
      if (!this.esFormacionValida(titular, suplente)) {
        return; 
      }
    }

    const currentTeam = this.team();
    if (!currentTeam) return;

    const newSquad = currentTeam.squad.map(p => {
      if (Number(p.id) === Number(titular.id)) return { ...p, isStarter: false };
      if (Number(p.id) === Number(suplente.id)) return { ...p, isStarter: true };
      return p;
    });

    const equipoActualizado: Teams = { ...currentTeam, squad: newSquad };
    this.jugadorSeleccionado = null;

    // Actualizamos el equipo en la partida activa y persistimos en el save
    this.gameState.updateTeam(equipoActualizado);
  }

  private esFormacionValida(titularSaliente: Player, suplenteEntrante: Player): boolean {
    // Creamos una lista hipotetica de como quedarian los titulares
    const nuevosTitulares: Player[] = this.titulares()
      .filter((p: Player) => p.id !== titularSaliente.id) // Sacamos al titular
      .concat(suplenteEntrante);                // Agregamos al suplente

    // Contamos cuantos hay de cada posición en esa nueva lista
    const gk = nuevosTitulares.filter(p => p.position === 'GK').length;
    const df = nuevosTitulares.filter(p => p.position === 'DF').length;
    const mf = nuevosTitulares.filter(p => p.position === 'MF').length;
    const fw = nuevosTitulares.filter(p => p.position === 'FW').length;

    if (gk !== 1) {
      this.errorMessage.set("El equipo debe tener exactamente 1 Arquero.");
      return false;
    }

    if (df < 3 || df > 5) {
      this.errorMessage.set(`Formación inválida: Defensores permitidos entre 3 y 5 (Tendrias ${df}).`);
      return false;
    }

    if (mf < 2 || mf > 5) {
      this.errorMessage.set(`Formación inválida: Mediocampistas permitidos entre 2 y 5 (Tendrias ${mf}).`);
      return false;
    }

    if (fw < 1 || fw > 4) {
      this.errorMessage.set(`Formación inválida: Delanteros permitidos entre 1 y 4 (Tendrias ${fw}).`);
      return false;
    }

    const formacionResultante = `${df}-${mf}-${fw}`;

    if (!VALID_FORMATIONS.includes(formacionResultante)) {
      this.errorMessage.set(`⚠️ Formación inválida (${formacionResultante}). Solo se permiten: ${VALID_FORMATIONS.join(', ')}`);
      return false;
    }

    return true;
  }

  goBack() {
    this.router.navigate(['/inicio', this.teamId]);
  }

  private ordenarPorPosicion(jugadores: Player[]) {
    const orden = ['GK', 'DF', 'MF', 'FW'];

    return [...jugadores].sort(
      (a, b) => orden.indexOf(a.position!) - orden.indexOf(b.position!)
    );
  }
  getTeamLogo(teamId: number): string {
    return `/logos/${teamId}.png`;
  }
  handleMissingImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '/logos/default.png'; 
  }


  
}


