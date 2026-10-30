import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { GameStateService } from '../game-state-service';
import { Teams } from '../../models/teams';



@Component({
  selector: 'app-menu-simulacion',
  imports: [CommonModule],
  templateUrl: './menu-simulacion.html',
  styleUrl: './menu-simulacion.css',
})

export class MenuSimulacion {

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private gameState = inject(GameStateService);

  private readonly routeTeamId = Number(this.route.snapshot.paramMap.get('id') ?? 0);

  protected get teamId(): number {
    return Number(this.gameState.selectedTeamId() ?? this.routeTeamId);
  }

  // obtenemos el equipo seleccionado del estado del juego
  protected team = computed<Teams | undefined>(() => {
    const id = Number(this.gameState.selectedTeamId() ?? this.routeTeamId);
    if (!id) return undefined;
    return this.gameState.getTeamById(id);
  });

  protected readonly hasPendingMatches = computed(() =>
    this.gameState.fixture().some(m => !m.played)
  );

  // Computeds para separar jugadores por línea 
  viewGK = computed(() => this.team()?.squad.filter(p => p.isStarter && p.position === 'GK') ?? []);
  viewDF = computed(() => this.team()?.squad.filter(p => p.isStarter && p.position === 'DF') ?? []);
  viewMF = computed(() => this.team()?.squad.filter(p => p.isStarter && p.position === 'MF') ?? []);
  viewFW = computed(() => this.team()?.squad.filter(p => p.isStarter && p.position === 'FW') ?? []);

  // Computed para mostrar el esquema 
  currentFormation = computed(() => {
    if (!this.team()) return '...';
    const df = this.viewDF().length;
    const mf = this.viewMF().length;
    const fw = this.viewFW().length;
    return `${df}-${mf}-${fw}`;
  });

  constructor() {
    if (!this.gameState.hasActiveOrRestorableSave()) {
      this.router.navigate(['/menu']);
      return;
    }
  }

  goBack() {
    this.router.navigate(['/inicio', this.teamId]);
  }
  navigateToSimulacionPartido(_id?: number) {
    if (!this.hasPendingMatches()) {
      this.router.navigate(['/inicio', this.teamId]);
      return;
    }
    this.gameState.authorizeNextMatchSimulation();
    this.router.navigateByUrl(`/simulacionPartido/${this.teamId}`);
  }
  navigateToSimulacionPartidoRapido(_id?: number) {
    if (!this.hasPendingMatches()) {
      this.router.navigate(['/inicio', this.teamId]);
      return;
    }
    this.gameState.authorizeNextMatchSimulation();
    this.router.navigateByUrl(`/simulacionPartidoRapido/${this.teamId}`);
  }
}