import { Saves } from './models/saves';
import { Routes } from '@angular/router';
import { TeamsSelectionComponent } from './equipos/teams-selection-component/teams-selection-component';
import { PlantelComponent } from './equipos/plantel-component/plantel-component';
import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './guards/auth-guard';
import { RegisterComponent } from './auth/register/register.component';
import { InicioComponent } from './menu-jugar/inicio-component/inicio-component';
import { MenuComponent } from './menu-principal/menu-principal.component';
import { FixtureComponent } from './menu-jugar/fixture-component/fixture-component';
import { PlantillaComponent } from './menu-jugar/plantilla-component/plantilla-component';
import { FormAgregarJugador } from './admin/form-agregar-jugdaor/form-agregar-jugador';
import { MenuAdmin } from './admin/menu-admin/menu-admin';
import { TablaComponent } from './menu-jugar/tabla-component/tabla-component';
import { MenuSimulacion } from './menu-jugar/menu-simulacion/menu-simulacion';
import { SimularPartido } from './menu-jugar/menu-simulacion/simular-partido/simular-partido';
import { SimularPartidoRapido } from './menu-jugar/menu-simulacion/simular-partido-rapido/simular-partido-rapido';
import { EstadisticasEquipo } from './menu-jugar/estadisticas-equipo/estadisticas-equipo';
import { EstadisticasTorneo } from './menu-jugar/estadisticas-torneo/estadisticas-torneo';
import { MercadoPases } from './menu-jugar/mercado-pases/mercado-pases';
import { LoginGuard } from './guards/login-guard';
import { ManageDB } from './admin/manage-db/manage-db';
import { PlayerGuard } from './guards/player-guard';
import { AdminGuard } from './guards/admin-guard';
import { ListaPartidasGuardadas } from './lista-partidas-guardadas/lista-partidas-guardadas';


export const routes: Routes = [
  {
    path: 'listaTeams',
    canActivate: [AuthGuard, PlayerGuard],
    component: TeamsSelectionComponent
  },
  {
    path: 'listaTeams/:id',
    canActivate: [AuthGuard],
    component: PlantelComponent
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'menu',
    canActivate: [AuthGuard, PlayerGuard],
    component: MenuComponent
  },
  {
    path: 'inicio/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: InicioComponent
  },
  {
    path: 'fixture/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: FixtureComponent
  },
  {
    path: 'plantilla/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: PlantillaComponent
  },
  {
    path: 'mercadoPases/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: MercadoPases
  },
  {
    path: 'menuAdmin',
    canActivate: [AuthGuard, AdminGuard],
    component: MenuAdmin
  },
  {
    path: 'formAgregarJugador',
    canActivate: [AuthGuard, AdminGuard],
    component: FormAgregarJugador
  },
  {
    path: 'formAgregarJugador/:teamId/:playerId',
    canActivate: [AuthGuard, AdminGuard],
    component: FormAgregarJugador
  },//Editar
  {
    path: 'menuAdmin/db',
    canActivate: [AuthGuard, AdminGuard],
    component: ManageDB
  },
  {
    path: 'admin/editar/:teamId/:playerId',
    canActivate: [AuthGuard, AdminGuard],
    component: FormAgregarJugador
  },
  {
    path: 'tabla/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: TablaComponent
  },
  {
    path: 'menuSimulacion/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: MenuSimulacion
  },
  {
    path: 'simulacionPartido/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: SimularPartido
  },
  {
    path: 'simulacionPartidoRapido/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: SimularPartidoRapido
  },
  {
    path: 'estadisticasEquipo/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: EstadisticasEquipo
  },
  {
    path: 'estadisticasTorneo/:id',
    canActivate: [AuthGuard, PlayerGuard],
    component: EstadisticasTorneo
  },
  {
    path: 'listaPartidasGuardadas',
    canActivate: [AuthGuard, PlayerGuard],
    component: ListaPartidasGuardadas
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];