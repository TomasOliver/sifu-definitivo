import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { GameStateService } from '../../menu-jugar/game-state-service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Player } from '../../models/player';
import { LeagueStanding } from '../../models/league-standing';

@Component({
  selector: 'app-tabla-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tabla-component.html',
  styleUrls: ['./tabla-component.css']
})
export class TablaComponent {

  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routeTeamId = Number(this.route.snapshot.paramMap.get('id'));

  protected get teamId(): number {
    return Number(this.gameState.selectedTeamId() ?? this.routeTeamId);
  }

  // Estado UI del detalle del equipo seleccionado en la tabla
  protected readonly selectedDetailTeamId = signal<number | null>(null);

  constructor() {
    if (!this.gameState.hasActiveOrRestorableSave()) {
      this.router.navigate(['/menu']);
      return;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.selectedDetailTeamId() !== null) {
      this.closeTeamDetail();
    }
  }

  // Acceso a la tabla desde el estado global
  readonly standings = computed(() => this.gameState.standings());

  // Equipos (para mostrar el nombre/escudo)
  readonly teams = computed(() => this.gameState.teams());

  // Tabla ordenada con reglas reales
  readonly sortedStandings = computed(() => {
    return [...this.standings()].sort((a, b) => {
      // Puntos
      if (b.points !== a.points) return b.points - a.points;

      // Diferencia de gol
      const dgA = a.goalsFor - a.goalsAgainst;
      const dgB = b.goalsFor - b.goalsAgainst;
      if (dgB !== dgA) return dgB - dgA;

      // Goles a favor
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

      // Nombre del equipo alfabéticamente
      const teamA = this.teams().find(t => Number(t.id) === Number(a.teamId))?.name ?? '';
      const teamB = this.teams().find(t => Number(t.id) === Number(b.teamId))?.name ?? '';

      return teamA.localeCompare(teamB);
    });
  });

  // Datos completos del equipo seleccionado para el modal de Detalle (Formación + Estadísticas)
  protected readonly selectedTeamDetail = computed(() => {
    const targetId = this.selectedDetailTeamId();
    if (targetId === null) return null;

    const team = this.teams().find(t => Number(t.id) === Number(targetId));
    if (!team) return null;

    const sorted = this.sortedStandings();
    const standingIndex = sorted.findIndex(s => Number(s.teamId) === Number(targetId));
    const standing = standingIndex >= 0 ? sorted[standingIndex] : null;
    const position = standingIndex >= 0 ? standingIndex + 1 : 1;

    const squad = team.squad ?? [];
    const starters = this.sortByPosition(squad.filter(p => p.isStarter));
    const substitutes = this.sortByPosition(squad.filter(p => !p.isStarter));
    const orderedSquad = [...starters, ...substitutes];

    const viewGK = starters.filter(p => p.position === 'GK');
    const viewDF = starters.filter(p => p.position === 'DF');
    const viewMF = starters.filter(p => p.position === 'MF');
    const viewFW = starters.filter(p => p.position === 'FW');

    const formation = `${viewDF.length}-${viewMF.length}-${viewFW.length}`;

    const avgRating = starters.length > 0
      ? Math.round(starters.reduce((acc, p) => acc + p.rating, 0) / starters.length)
      : 0;

    const totalGoals = squad.reduce((acc, p) => acc + (p.stats?.goals ?? 0), 0);
    const totalAssists = squad.reduce((acc, p) => acc + (p.stats?.assists ?? 0), 0);
    const totalYellows = squad.reduce((acc, p) => acc + (p.stats?.yellowCards ?? 0), 0);
    const totalReds = squad.reduce((acc, p) => acc + (p.stats?.redCards ?? 0), 0);

    return {
      team,
      standing,
      position,
      formation,
      avgRating,
      starters,
      substitutes,
      orderedSquad,
      viewGK,
      viewDF,
      viewMF,
      viewFW,
      totals: {
        goals: totalGoals,
        assists: totalAssists,
        yellows: totalYellows,
        reds: totalReds
      }
    };
  });

  openTeamDetail(row: LeagueStanding, _index?: number) {
    this.selectedDetailTeamId.set(Number(row.teamId));
  }

  closeTeamDetail() {
    this.selectedDetailTeamId.set(null);
  }

  getShortPlayerName(name: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return 'Jugador';
    return trimmed.split(/\s+/).pop() || trimmed;
  }

  private sortByPosition(players: Player[]): Player[] {
    const order = ['GK', 'DF', 'MF', 'FW'];
    return [...players].sort(
      (a, b) => order.indexOf(a.position ?? '') - order.indexOf(b.position ?? '')
    );
  }

  isUserTeam(id: number): boolean {
    return Number(id) === Number(this.teamId);
  }

  getTeamName(id: number): string {
    return this.teams().find(t => Number(t.id) === Number(id))?.name ?? 'Equipo';
  }

  getTeamShortName(id: number): string {
    return this.teams().find(t => Number(t.id) === Number(id))?.shortName ?? '';
  }

  getTeamLogo(teamId: number): string {
    return `/logos/${teamId}.png`;
  }

  handleMissingImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.onerror = null;
    // Si falla pone el escudo por defecto
    imgElement.src = '/logos/default.png';
  }

  goBack() {
    this.router.navigate(['/inicio', this.teamId]);
  }
}
