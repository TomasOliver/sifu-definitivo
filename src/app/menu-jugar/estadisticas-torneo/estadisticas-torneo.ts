import { Component, computed, inject } from '@angular/core';
import { GameStateService } from '../game-state-service';
import { Player } from '../../models/player';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-estadisticas-torneo',
  imports: [RouterLink],
  templateUrl: './estadisticas-torneo.html',
  styleUrl: './estadisticas-torneo.css'
})
export class EstadisticasTorneo {

  private readonly gameState = inject(GameStateService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));
  private readonly location = inject(Location);

  goBack() {
    this.router.navigate(['/inicio', this.teamId]);
  }

  private readonly allPlayers = computed<Player[]>(() =>
    this.gameState.teams().flatMap(t => t.squad)
  );

  topGoals = computed(() =>
    [...this.allPlayers()].sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 10)
  );

  topAssists = computed(() =>
    [...this.allPlayers()].sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 10)
  );

  topYellows = computed(() =>
    [...this.allPlayers()].sort((a, b) => b.stats.yellowCards - a.stats.yellowCards).slice(0, 10)
  );

  topReds = computed(() =>
    [...this.allPlayers()].sort((a, b) => b.stats.redCards - a.stats.redCards).slice(0, 10)
  );
}
