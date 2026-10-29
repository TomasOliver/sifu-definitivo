import { Component, computed, inject, signal } from '@angular/core';
import { TeamsService } from '../../equipos/teams-service'; 
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { Teams } from '../../models/teams'; 

@Component({
  selector: 'app-plantel-component',
  standalone: true,
  imports: [],
  templateUrl: './plantel-component.html',
  styleUrl: './plantel-component.css',
})
export class PlantelComponent {
  private readonly service = inject(TeamsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly teamSource = signal<Teams | undefined>(undefined);

  constructor() {
    this.service.getTeamById(this.teamId).subscribe(team => {
      this.teamSource.set(team);
    });
  }

  public readonly team = computed(() => this.teamSource());
  public readonly squad = computed(() => this.teamSource()?.squad ?? []);
  public readonly isLoading = computed(() => this.teamSource() === undefined);

  // Separamos las listas
  titulares = computed(() => this.squad().filter(p => p.isStarter));
  suplentes = computed(() => this.squad().filter(p => !p.isStarter));

  goBack() {
    this.location.back();
  }
}