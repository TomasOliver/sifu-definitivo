import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameStateService } from '../game-state-service';
import { Player } from '../../models/player';
import { Teams } from '../../models/teams';

const VALID_FORMATIONS = [
  '3-4-3', '3-5-2',
  '4-2-4', '4-3-3', '4-4-2', '4-5-1',
  '5-2-3', '5-3-2', '5-4-1'
];

@Component({
  selector: 'app-mercado-pases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mercado-pases.html',
  styleUrl: './mercado-pases.css',
})
export class MercadoPases {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameState = inject(GameStateService);

  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));

  // Equipos y equipo del usuario
  protected readonly teams = computed(() => this.gameState.teams());
  protected readonly myTeam = computed(() => this.gameState.getTeamById(this.teamId));

  // Contador reactivo de intentos restantes (máximo 10 por partida)
  protected readonly attemptsLeft = computed(() => this.gameState.transferAttemptsLeft());
  protected readonly maxAttempts = 10;
  protected readonly transferHistory = computed(() => this.gameState.transferHistory());

  // Equipos rivales disponibles para negociar
  protected readonly rivalTeams = computed(() =>
    this.teams().filter(t => Number(t.id) !== Number(this.teamId))
  );

  // Estado UI de selección
  protected readonly selectedRivalTeamId = signal<number | null>(null);
  protected readonly selectedMyPlayerId = signal<number | null>(null);
  protected readonly selectedTargetPlayerId = signal<number | null>(null);
  protected readonly filterPosition = signal<'ALL' | 'GK' | 'DF' | 'MF' | 'FW'>('ALL');
  protected readonly searchQuery = signal<string>('');

  // Resultado del último intento y estado de guardado
  protected readonly isSavingTrade = signal<boolean>(false);
  protected readonly negotiationFeedback = signal<{
    accepted: boolean;
    title: string;
    message: string;
    probability: number;
  } | null>(null);

  private initializedRival = false;

  constructor() {
    effect(() => {
      const rivals = this.rivalTeams();
      if (rivals.length > 0 && !this.initializedRival) {
        this.selectedRivalTeamId.set(rivals[0].id);
        this.initializedRival = true;
      }
    });
  }

  protected readonly selectedRivalTeam = computed(() => {
    const id = this.selectedRivalTeamId();
    if (!id) return null;
    return this.rivalTeams().find(t => Number(t.id) === Number(id)) ?? null;
  });

  // Mi plantel ordenado por posición
  protected readonly mySquad = computed(() => {
    const squad = this.myTeam()?.squad ?? [];
    const posFilter = this.filterPosition();
    const sorted = this.sortByPosition(squad);
    if (posFilter === 'ALL') return sorted;
    return sorted.filter(p => p.position === posFilter);
  });

  // Plantel del club rival filtrado
  protected readonly rivalSquad = computed(() => {
    const squad = this.selectedRivalTeam()?.squad ?? [];
    const posFilter = this.filterPosition();
    const query = this.searchQuery().trim().toLowerCase();
    let list = this.sortByPosition(squad);

    if (posFilter !== 'ALL') {
      list = list.filter(p => p.position === posFilter);
    }
    if (query) {
      list = list.filter(p => p.name.toLowerCase().includes(query));
    }
    return list;
  });

  protected readonly selectedMyPlayer = computed(() => {
    const id = this.selectedMyPlayerId();
    if (id === null) return null;
    return (this.myTeam()?.squad ?? []).find(p => Number(p.id) === Number(id)) ?? null;
  });

  protected readonly selectedTargetPlayer = computed(() => {
    const id = this.selectedTargetPlayerId();
    if (id === null) return null;
    return (this.selectedRivalTeam()?.squad ?? []).find(p => Number(p.id) === Number(id)) ?? null;
  });

  // Validación táctica (para no dejar un equipo sin arquero o con formación inválida si ambos son titulares)
  protected readonly tacticalValidation = computed(() => {
    const myP = this.selectedMyPlayer();
    const targetP = this.selectedTargetPlayer();
    const myTeam = this.myTeam();
    const rivalTeam = this.selectedRivalTeam();

    if (!myP || !targetP || !myTeam || !rivalTeam) {
      return { valid: true, reason: '' };
    }

    // Regla 1: Un arquero (GK) solo puede intercambiarse por otro arquero (GK)
    if ((myP.position === 'GK' || targetP.position === 'GK') && myP.position !== targetP.position) {
      return {
        valid: false,
        reason: 'Los arqueros (GK) solo pueden intercambiarse por otro arquero (GK) para mantener planteles reglamentarios.'
      };
    }

    // Regla 2: Si el jugador que sale es titular y cambia de posición, verificar que la formación resultante sea válida
    if (myP.position !== targetP.position) {
      if (myP.isStarter && !this.wouldFormationRemainValid(myTeam, myP, targetP)) {
        return {
          valid: false,
          reason: `Este cambio dejaría a tu equipo con una formación titular inválida. Elegí un jugador de la misma posición (${myP.position}) o pasalo al banquillo primero.`
        };
      }
      if (targetP.isStarter && !this.wouldFormationRemainValid(rivalTeam, targetP, myP)) {
        return {
          valid: false,
          reason: `El ${rivalTeam.name} no puede aceptar un ${myP.position} por su ${targetP.position} titular porque desarmaría su esquema táctico.`
        };
      }
    }

    return { valid: true, reason: '' };
  });

  // Cálculo de probabilidad (Basado en Media y Posición/Rol, SIN edad)
  protected readonly tradeEvaluation = computed(() => {
    const myP = this.selectedMyPlayer();
    const targetP = this.selectedTargetPlayer();

    if (!myP || !targetP) return null;

    const diff = myP.rating - targetP.rating; // positivo si ofrezco mejor media, negativo si pido mejor media
    let prob = 65; // Probabilidad base a igualdad de media (ej. 80 por 80 = 65%)

    if (diff > 0) {
      // Ofrezco un jugador con mayor media que el que pido
      prob += diff * 8;
    } else if (diff < 0) {
      const gap = Math.abs(diff);
      if (gap <= 3) {
        // Diferencia corta (1 a 3 puntos): baja 11% por punto
        prob -= gap * 11;
      } else if (gap <= 7) {
        // Diferencia media (4 a 7 puntos): ej. 78 por 84 (-6) -> ~12%
        prob = 32 - (gap - 3) * 5.5;
      } else {
        // Diferencia grande (8+ puntos, ej. 75 por 88 = -13): casi imposible (2% a 6%)
        prob = Math.max(2, 10 - (gap - 7) * 1.5);
      }
    }

    // Modificador por coincidencia de posición (misma línea táctica facilita el trueque)
    const samePos = myP.position === targetP.position;
    if (samePos) {
      prob += 8;
    } else {
      prob -= 8;
    }

    // Modificador si el jugador solicitado es figura titular en su equipo
    if (targetP.isStarter) {
      prob -= 6;
    } else {
      prob += 4;
    }

    // Limitar entre 2% y 95%
    const finalProb = Math.round(Math.max(2, Math.min(95, prob)));

    let difficultyLabel = 'Negociación Pareja';
    let badgeClass = 'medium';

    if (finalProb >= 70) {
      difficultyLabel = 'Alta Probabilidad';
      badgeClass = 'high';
    } else if (finalProb >= 40) {
      difficultyLabel = 'Posible / Parejo';
      badgeClass = 'medium';
    } else if (finalProb >= 15) {
      difficultyLabel = 'Difícil / Arriesgado';
      badgeClass = 'low';
    } else {
      difficultyLabel = 'Casi Imposible';
      badgeClass = 'very-low';
    }

    return {
      probability: finalProb,
      ratingDiff: diff,
      samePosition: samePos,
      targetIsStarter: targetP.isStarter,
      difficultyLabel,
      badgeClass,
    };
  });

  private wouldFormationRemainValid(team: Teams, outgoingStarter: Player, incomingPlayer: Player): boolean {
    const newStarters = team.squad
      .filter(p => p.isStarter && Number(p.id) !== Number(outgoingStarter.id))
      .concat({ ...incomingPlayer, isStarter: true });

    const gk = newStarters.filter(p => p.position === 'GK').length;
    const df = newStarters.filter(p => p.position === 'DF').length;
    const mf = newStarters.filter(p => p.position === 'MF').length;
    const fw = newStarters.filter(p => p.position === 'FW').length;

    if (gk !== 1) return false;
    const code = `${df}-${mf}-${fw}`;
    return VALID_FORMATIONS.includes(code);
  }

  selectRivalTeam(teamId: number) {
    this.selectedRivalTeamId.set(Number(teamId));
    this.selectedTargetPlayerId.set(null);
    this.negotiationFeedback.set(null);
  }

  selectMyPlayer(player: Player) {
    this.selectedMyPlayerId.set(Number(player.id));
    this.negotiationFeedback.set(null);
  }

  selectTargetPlayer(player: Player) {
    this.selectedTargetPlayerId.set(Number(player.id));
    this.negotiationFeedback.set(null);
  }

  setPositionFilter(pos: 'ALL' | 'GK' | 'DF' | 'MF' | 'FW') {
    this.filterPosition.set(pos);
  }

  proposeTrade() {
    const myP = this.selectedMyPlayer();
    const targetP = this.selectedTargetPlayer();
    const rivalTeam = this.selectedRivalTeam();
    const evalData = this.tradeEvaluation();
    const validation = this.tacticalValidation();

    if (!myP || !targetP || !rivalTeam || !evalData || !validation.valid) return;
    if (this.attemptsLeft() <= 0 || this.isSavingTrade()) return;

    const roll = Math.random() * 100;
    const accepted = roll < evalData.probability;

    this.isSavingTrade.set(true);

    this.gameState.executeTransferAttempt({
      myTeamId: this.teamId,
      myPlayerId: Number(myP.id),
      targetTeamId: rivalTeam.id,
      targetPlayerId: Number(targetP.id),
      probability: evalData.probability,
      accepted,
    }).subscribe({
      next: () => {
        this.isSavingTrade.set(false);
      },
      error: () => {
        this.isSavingTrade.set(false);
      }
    });

    if (accepted) {
      this.negotiationFeedback.set({
        accepted: true,
        probability: evalData.probability,
        title: '¡Traspaso Aceptado!',
        message: `El ${rivalTeam.name} aceptó la propuesta. ¡${targetP.name} (${targetP.rating}) se incorpora a tu plantel a cambio de ${myP.name} (${myP.rating})!`
      });
      this.selectedMyPlayerId.set(null);
      this.selectedTargetPlayerId.set(null);
    } else {
      this.negotiationFeedback.set({
        accepted: false,
        probability: evalData.probability,
        title: 'Oferta Rechazada',
        message: `El ${rivalTeam.name} rechazó el intercambio de ${myP.name} (${myP.rating}) por ${targetP.name} (${targetP.rating}). Se descontó 1 intento de negociación.`
      });
    }
  }

  private sortByPosition(players: Player[]): Player[] {
    const order = ['GK', 'DF', 'MF', 'FW'];
    return [...players].sort((a, b) => {
      const posDiff = order.indexOf(a.position ?? '') - order.indexOf(b.position ?? '');
      if (posDiff !== 0) return posDiff;
      return b.rating - a.rating;
    });
  }

  getTeamLogo(id: number): string {
    return `/logos/${id}.png`;
  }

  handleMissingImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '/logos/default.png';
  }

  goBack() {
    this.router.navigate(['/inicio', this.teamId]);
  }
}
