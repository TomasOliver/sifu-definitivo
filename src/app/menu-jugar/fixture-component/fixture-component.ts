import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../menu-jugar/game-state-service';
import { Match } from '../../models/match';
import { Teams } from '../../models/teams';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-fixture',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './fixture-component.html',
  styleUrl: './fixture-component.css',
})
export class FixtureComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameState = inject(GameStateService);

  private readonly routeTeamId = Number(this.route.snapshot.paramMap.get('id'));

  protected get teamId(): number {
    return Number(this.gameState.selectedTeamId() ?? this.routeTeamId);
  }

  // Estado UI del selector de jornadas (estilo OneFootball)
  protected readonly selectedMatchday = signal<number>(1);
  protected readonly isSelectorOpen = signal<boolean>(false);
  protected readonly viewAllMatchdays = signal<boolean>(false);

  // Estado UI del detalle del partido seleccionado (por ID para mantenerse reactivo al fixture)
  protected readonly selectedMatchId = signal<number | null>(null);
  protected readonly activeDetailTab = signal<'resumen' | 'comentarios'>('resumen');

  private initializedMatchday = false;

  constructor() {
    if (!this.gameState.hasActiveOrRestorableSave()) {
      this.router.navigate(['/menu']);
      return;
    }

    // Posicionamos automáticamente en la jornada en curso al cargar el fixture
    effect(() => {
      const matchdays = this.fixtureByMatchday();
      if (matchdays.length > 0 && !this.initializedMatchday) {
        const nextUnplayed = matchdays.find(md => md.games.some(g => !g.played));
        const activeMd = nextUnplayed
          ? nextUnplayed.matchday
          : matchdays[matchdays.length - 1].matchday;
        this.selectedMatchday.set(activeMd);
        this.initializedMatchday = true;
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.selectedMatchId() !== null) {
      this.closeMatchDetail();
    } else if (this.isSelectorOpen()) {
      this.closeSelector();
    }
  }

  goBack() {
    this.router.navigate(['/inicio', this.teamId]);
  }

  // acceso directo al fixture y equipos desde los signals del estado global
  protected readonly fixture = computed(() => this.gameState.fixture());
  protected readonly teams = computed(() => this.gameState.teams());

  // agrupamos partidos por fecha (matchday)
  protected readonly fixtureByMatchday = computed(() => {
    const matches = this.fixture();
    const map = new Map<number, Match[]>();

    matches.forEach(m => {
      if (!map.has(m.matchday)) {
        map.set(m.matchday, []);
      }
      map.get(m.matchday)!.push(m);
    });

    // ordenar por fecha
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([matchday, games]) => {
        const playedCount = games.filter(g => g.played).length;
        return {
          matchday,
          games,
          playedCount,
          totalCount: games.length,
          allPlayed: playedCount === games.length && games.length > 0,
        };
      });
  });

  // Indica si ya se completaron todas las jornadas del torneo
  protected readonly isSeasonFinished = computed(() => {
    const matchdays = this.fixtureByMatchday();
    return matchdays.length > 0 && matchdays.every(md => md.allPlayed);
  });

  // Jornada actual de la temporada (primera con partidos pendientes, o la última si finalizó)
  protected readonly activeSeasonMatchday = computed(() => {
    const matchdays = this.fixtureByMatchday();
    if (matchdays.length === 0) return 1;
    const nextUnplayed = matchdays.find(md => !md.allPlayed);
    return nextUnplayed ? nextUnplayed.matchday : matchdays[matchdays.length - 1].matchday;
  });

  // Datos de la jornada seleccionada actualmente
  protected readonly currentMatchdayData = computed(() => {
    const matchdays = this.fixtureByMatchday();
    return matchdays.find(md => md.matchday === this.selectedMatchday()) ?? matchdays[0] ?? null;
  });

  // Jornadas que se renderizan en pantalla (1 sola estilo OneFootball o todas)
  protected readonly displayedMatchdays = computed(() => {
    if (this.viewAllMatchdays()) {
      return this.fixtureByMatchday();
    }
    const current = this.currentMatchdayData();
    return current ? [current] : [];
  });

  protected readonly minMatchday = computed(() => {
    const matchdays = this.fixtureByMatchday();
    return matchdays.length > 0 ? matchdays[0].matchday : 1;
  });

  protected readonly maxMatchday = computed(() => {
    const matchdays = this.fixtureByMatchday();
    return matchdays.length > 0 ? matchdays[matchdays.length - 1].matchday : 1;
  });

  protected readonly selectedMatch = computed(() => {
    const id = this.selectedMatchId();
    if (id === null) return null;
    return this.fixture().find(m => m.id === id) ?? null;
  });

  // Estadísticas y eventos del partido seleccionado para el modal de Detalle
  protected readonly selectedMatchDetails = computed(() => {
    const match = this.selectedMatch();
    if (!match) return null;

    const homeTeam = this.getTeamById(match.homeTeamId);
    const awayTeam = this.getTeamById(match.awayTeamId);
    const events = [...(match.events ?? [])].sort((a, b) => a.minute - b.minute);
    const reverseEvents = [...events].reverse();

    const homeEvents = events.filter(e => Number(e.teamId) === Number(match.homeTeamId));
    const awayEvents = events.filter(e => Number(e.teamId) === Number(match.awayTeamId));

    const homeStats = {
      goals: match.homeGoals ?? 0,
      assists: homeEvents.filter(e => e.type === 'goal' && !!e.assistId).length,
      yellows: homeEvents.filter(e => e.type === 'yellow').length,
      reds: homeEvents.filter(e => e.type === 'red').length,
      ratingAvg: this.getTeamStarterAverage(homeTeam),
    };

    const awayStats = {
      goals: match.awayGoals ?? 0,
      assists: awayEvents.filter(e => e.type === 'goal' && !!e.assistId).length,
      yellows: awayEvents.filter(e => e.type === 'yellow').length,
      reds: awayEvents.filter(e => e.type === 'red').length,
      ratingAvg: this.getTeamStarterAverage(awayTeam),
    };

    return {
      match,
      homeTeam,
      awayTeam,
      events,
      reverseEvents,
      homeEvents,
      awayEvents,
      homeStats,
      awayStats,
    };
  });

  toggleSelector() {
    const nextState = !this.isSelectorOpen();
    this.isSelectorOpen.set(nextState);
    if (nextState) {
      setTimeout(() => {
        document.querySelector('.matchday-dropdown-item.selected')?.scrollIntoView({
          block: 'center',
          behavior: 'instant' as ScrollBehavior
        });
      }, 0);
    }
  }

  closeSelector() {
    this.isSelectorOpen.set(false);
  }

  selectMatchday(matchday: number) {
    this.selectedMatchday.set(matchday);
    this.viewAllMatchdays.set(false);
    this.isSelectorOpen.set(false);
  }

  prevMatchday() {
    if (this.viewAllMatchdays()) {
      this.viewAllMatchdays.set(false);
      return;
    }
    const current = this.selectedMatchday();
    if (current > this.minMatchday()) {
      this.selectedMatchday.set(current - 1);
    }
  }

  nextMatchday() {
    if (this.viewAllMatchdays()) {
      this.viewAllMatchdays.set(false);
      return;
    }
    const current = this.selectedMatchday();
    if (current < this.maxMatchday()) {
      this.selectedMatchday.set(current + 1);
    }
  }

  goToActiveMatchday() {
    this.selectedMatchday.set(this.activeSeasonMatchday());
    this.viewAllMatchdays.set(false);
    this.isSelectorOpen.set(false);
  }

  toggleViewAll() {
    this.viewAllMatchdays.update(v => !v);
    this.isSelectorOpen.set(false);
  }

  openMatchDetail(match: Match) {
    this.selectedMatchId.set(match.id);
    this.activeDetailTab.set('resumen');
  }

  closeMatchDetail() {
    this.selectedMatchId.set(null);
  }

  setDetailTab(tab: 'resumen' | 'comentarios') {
    this.activeDetailTab.set(tab);
  }

  getTeamById(id: number | string): Teams | undefined {
    return this.teams().find(t => Number(t.id) === Number(id));
  }

  getTeamName(id: number | string): string {
    return this.getTeamById(id)?.name ?? '???';
  }

  getTeamShortName(id: number | string): string {
    return this.getTeamById(id)?.shortName ?? 'EQP';
  }

  getTeamLogo(id: number | string): string {
    return `/logos/${id}.png`;
  }

  handleMissingImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.onerror = null;
    imgElement.src = '/logos/default.png';
  }

  // Busca el nombre del jugador en el equipo del evento, y si fue traspasado luego, lo busca en el resto de clubes
  getPlayerName(teamId: number | string, playerId: number | undefined): string {
    if (playerId === undefined || playerId === null) return 'Desconocido';
    const targetId = Number(playerId);
    const team = this.getTeamById(teamId);
    const inOriginalTeam = team?.squad.find(p => Number(p.id) === targetId);
    if (inOriginalTeam) return inOriginalTeam.name;

    for (const club of this.teams()) {
      const found = club.squad.find(p => Number(p.id) === targetId);
      if (found) return found.name;
    }
    return 'Desconocido';
  }

  getTeamStarterAverage(team: Teams | undefined): number {
    if (!team || !team.squad || team.squad.length === 0) return 0;
    const starters = team.squad.filter(p => p.isStarter);
    const pool = starters.length > 0 ? starters : team.squad;
    const avg = pool.reduce((acc, p) => acc + p.rating, 0) / pool.length;
    return Math.round(avg);
  }

  isUserTeam(id: number | string): boolean {
    const myId = Number(this.gameState.selectedTeamId() ?? this.routeTeamId);
    return Number(id) === myId;
  }
}
