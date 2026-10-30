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

  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
  private readonly location = inject(Location);

  // obtenemos el equipo seleccionado del estado del juego
  protected team = computed<Teams | undefined>(() => {
    const id = this.gameState.selectedTeamId() ?? this.teamId;
    if (!id) return undefined;
    return this.gameState.getTeamById(id);
  });

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
  }

  goBack() {
    this.router.navigate(['/inicio', this.teamId]);
  }
  navigateToSimulacionPartido(id: number) {
    this.gameState.authorizeNextMatchSimulation();
    this.router.navigateByUrl(`/simulacionPartido/${id}`);
  }
  navigateToSimulacionPartidoRapido(id: number) {
    this.gameState.authorizeNextMatchSimulation();
    this.router.navigateByUrl(`/simulacionPartidoRapido/${id}`);
  }
}