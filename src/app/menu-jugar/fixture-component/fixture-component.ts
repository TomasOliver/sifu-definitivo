import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { GameStateService } from '../../menu-jugar/game-state-service';
import { Match } from '../../models/match';
import { MatchEvent } from '../../models/match-event';
import { Teams } from '../../models/teams';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-fixture',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './fixture-component.html',
  styleUrl: './fixture-component.css',
})
export class FixtureComponent {
  private readonly route = inject(ActivatedRoute);
  // sacamos el ID del equipo de la url
  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));
  private readonly location = inject(Location);
  private readonly gameState = inject(GameStateService);

  // Estado UI del selector de jornadas (estilo OneFootball)
  protected readonly selectedMatchday = signal<number>(1);
  protected readonly isSelectorOpen = signal<boolean>(false);
  protected readonly viewAllMatchdays = signal<boolean>(false);

  // Estado UI del detalle del partido seleccionado (comentarios y resumen)
  protected readonly selectedMatch = signal<Match | null>(null);
  protected readonly activeDetailTab = signal<'resumen' | 'comentarios'>('resumen');

  private initializedMatchday = false;

  constructor() {
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

  goBack() {
    this.location.back();
  }

  // acceso directo al fixture
  protected readonly fixture = computed(() => this.gameState.getState()?.fixture ?? []);

  // equipos (para mostrar nombres y escudos)
  protected readonly teams = computed(() => this.gameState.getState()?.teams ?? []);

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

  // Jornada actual de la temporada (primera con partidos pendientes)
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
    this.isSelectorOpen.update(v => !v);
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
    const current = this.selectedMatchday();
    if (current > this.minMatchday()) {
      this.selectedMatchday.set(current - 1);
      this.viewAllMatchdays.set(false);
    }
  }

  nextMatchday() {
    const current = this.selectedMatchday();
    if (current < this.maxMatchday()) {
      this.selectedMatchday.set(current + 1);
      this.viewAllMatchdays.set(false);
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
    this.selectedMatch.set(match);
    this.activeDetailTab.set('resumen');
  }

  closeMatchDetail() {
    this.selectedMatch.set(null);
  }

  setDetailTab(tab: 'resumen' | 'comentarios') {
    this.activeDetailTab.set(tab);
  }

  getTeamById(id: number): Teams | undefined {
    return this.teams().find(t => Number(t.id) === Number(id));
  }

  getTeamName(id: number): string {
    return this.getTeamById(id)?.name ?? '???';
  }

  getTeamShortName(id: number): string {
    return this.getTeamById(id)?.shortName ?? 'EQP';
  }

  getTeamLogo(id: number): string {
    return `/logos/${id}.png`;
  }

  getPlayerName(teamId: number, playerId: number | undefined): string {
    if (playerId === undefined || playerId === null) return 'Desconocido';
    const team = this.getTeamById(teamId);
    return team?.squad.find(p => Number(p.id) === Number(playerId))?.name ?? 'Desconocido';
  }

  getTeamStarterAverage(team: Teams | undefined): number {
    if (!team || !team.squad || team.squad.length === 0) return 0;
    const starters = team.squad.filter(p => p.isStarter);
    const pool = starters.length > 0 ? starters : team.squad;
    const avg = pool.reduce((acc, p) => acc + p.rating, 0) / pool.length;
    return Math.round(avg);
  }

  isUserTeam(id: number): boolean {
    return Number(id) === Number(this.teamId);
  }
}
