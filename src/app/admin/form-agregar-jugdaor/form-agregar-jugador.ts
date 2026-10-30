import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamsService } from '../../equipos/teams-service';
import { Player } from '../../models/player';
import { Location } from '@angular/common';
import { ModalService } from '../../shared/modal/modal.service';


@Component({
  selector: 'app-form-agregar-jugdaor',
  imports: [ReactiveFormsModule],
  templateUrl: './form-agregar-jugdaor.html',
  styleUrl: './form-agregar-jugador.css',
})
export class FormAgregarJugador {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TeamsService);
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private location = inject(Location);
  private readonly modal = inject(ModalService);


  public readonly jugadorAgregadoOModificado = output<Player>();
  public readonly editando = input(false);


  protected readonly esModoEdicion = computed(() => this.editando() || this.idUrl !== null);

  goBack() {
    this.location.back();
  }


  protected readonly playerStats = {
    goals: 0,
    assists: 0,
    matches: 0,
    starts: 0,
    yellowCards: 0,
    redCards: 0
  }
  protected readonly tipoDePosiciones = [
    'GK', 'DF', 'MF', 'FW'
  ]
  protected readonly equiposDisponibles = [{
    id: "1",
    name: "Manchester City",
  },
  {
    id: "2",
    name: "Liverpool",
  },
  {
    id: "3",
    name: "Manchester United",
  },
  {
    id: "4",
    name: "Arsenal",
  },
  {
    id: "5",
    name: "Chelsea",
  },
  {
    id: "6",
    name: "Tottenham Hotspur",
  },
  {
    id: "7",
    name: "Newcastle United",
  },
  {
    id: "8",
    name: "Aston Villa",
  },
  {
    id: "9",
    name: "Brighton & Hove Albion",
  },
  {
    id: "10",
    name: "West Ham United",
  },
  {
    id: "11",
    name: "Crystal Palace",
  },
  {
    id: "12",
    name: "Fulham",
  },
  {
    id: "13",
    name: "Brentford",
  },
  {
    id: "14",
    name: "AFC Bournemouth",
  },
  {
    id: "15",
    name: "Wolverhampton Wanderers",
  },
  {
    id: "16",
    name: "Nottingham Forest",
  },
  {
    id: "17",
    name: "Everton",
  },
  {
    id: "18",
    name: "Burnley",
  },
  {
    id: "19",
    name: "Sheffield United",
  },
  {
    id: "20",
    name: "Luton Town",
  },
  ]
  private currentStats = { goals: 0, assists: 0, matches: 0, starts: 0, yellowCards: 0, redCards: 0 };
  private idUrl: number | null = null;

  constructor() {
    //  Detectamos parametros de URL al instanciar la clase
    const params = this.route.snapshot.paramMap;
    const pTeamId = params.get('teamId');
    const pPlayerId = params.get('playerId');



    if (pTeamId && pPlayerId) {
      // Estamos en modo edicion por URL
      this.idUrl = Number(pPlayerId);
      const teamIdNum = Number(pTeamId);

      this.service.getTeamById(teamIdNum).subscribe(team => {
        const playerFound = team.squad.find(p => Number(p.id) === this.idUrl);

        if (playerFound) {
          this.currentStats = { ...playerFound.stats };

          this.form.patchValue({
            teamId: String(team.id),
            name: playerFound.name,
            position: playerFound.position,
            rating: playerFound.rating,
            shirtNumber: playerFound.shirtNumber,
            isStarter: playerFound.isStarter
          });

          this.form.controls.teamId.disable();
        }
      });
    }

  }

  protected readonly form = this.fb.nonNullable.group({
    teamId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    position: ['', [Validators.required]],
    rating: [60, [Validators.required, Validators.min(1), Validators.max(99)]],
    shirtNumber: [0, [Validators.required, Validators.min(1), Validators.max(99)]],
    isStarter: [false, [Validators.required]],
    stats: [{ ...this.playerStats }]
  });



  /// getters
  get teamId() {
    return this.form.controls.teamId;
  }

  get name() {
    return this.form.controls.name;
  }

  get position() {
    return this.form.controls.position;
  }

  get rating() {
    return this.form.controls.rating;
  }

  get shirtNumber() {
    return this.form.controls.shirtNumber;
  }

  get isStarter() {
    return this.form.controls.isStarter
  }

  async handleSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.modal.alert({
        title: 'Formulario inválido',
        message: 'Por favor revisá y completá todos los campos obligatorios con valores válidos.',
        variant: 'warning',
        confirmText: 'Revisar',
      });
      return;
    }

    const rawValues = this.form.getRawValue();


    const idFinal = this.esModoEdicion() ? this.idUrl! : Date.now();

    const nuevoJugador: Player = {
      id: idFinal,
      name: rawValues.name,
      position: rawValues.position as 'GK' | 'DF' | 'MF' | 'FW',
      rating: rawValues.rating,
      shirtNumber: rawValues.shirtNumber,
      isStarter: rawValues.isStarter,
      stats: this.esModoEdicion() ? { ...this.currentStats } : { ...this.playerStats }
    };

    const accion = this.esModoEdicion() ? 'editar' : 'crear';

    const confirmado = await this.modal.confirm({
      title: this.esModoEdicion() ? 'Confirmar edición' : 'Confirmar creación',
      message: `¿Deseás ${accion} los datos de ${nuevoJugador.name}?`,
      variant: 'info',
      confirmText: 'Sí, guardar',
      cancelText: 'Cancelar',
    });

    if (confirmado) {

      const idEquipo = Number(rawValues.teamId);

      if (!this.esModoEdicion()) {
        this.service.addPlayerToTeam(idEquipo, nuevoJugador).subscribe({
          next: () => {
            this.jugadorAgregadoOModificado.emit(nuevoJugador);
            this.modal.alert({
              title: '¡Jugador creado!',
              message: `${nuevoJugador.name} fue incorporado al plantel correctamente.`,
              variant: 'success',
              confirmText: 'Aceptar',
            });
            this.form.reset();
            // Reiniciar stats por si se agrega otro seguido
            this.currentStats = { goals: 0, assists: 0, matches: 0, starts: 0, yellowCards: 0, redCards: 0 };
          }
        });

      } else {
        this.service.updatePlayer(idEquipo, nuevoJugador).subscribe({
          next: () => {
            this.modal.alert({
              title: '¡Jugador actualizado!',
              message: `Los datos de ${nuevoJugador.name} fueron editados correctamente.`,
              variant: 'success',
              confirmText: 'Continuar',
            }).then(() => {
              this.router.navigate(['/menuAdmin/db']);
            });
          },
          error: (err) => console.error('Error al editar', err)
        });
      }
    }
  }
}
