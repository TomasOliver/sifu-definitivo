import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../menu-jugar/game-state-service';
import { Match } from '../../models/match';
import { Location } from '@angular/common';
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

  goBack() {
    this.location.back();
  }
  private readonly gameState = inject(GameStateService);

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
      .map(([matchday, games]) => ({
        matchday,
        games
      }));
  });

  getTeamName(id: number): string {
    return this.teams().find(t => t.id == id)?.name ?? '???';
  }

}
