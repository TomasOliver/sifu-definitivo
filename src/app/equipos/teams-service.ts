import { Injectable, signal } from '@angular/core';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Teams } from '../models/teams';
import { Player } from '../models/player';
import { Observable, from, throwError } from 'rxjs';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../firebase.config';

@Injectable({
  providedIn: 'root',
})
export class TeamsService {
  private readonly teamsCol = collection(firestoreDb, 'teams');
  private readonly teams = signal<Teams[]>([]);

  getAllTeams(): Observable<Teams[]> {
    return from(getDocs(this.teamsCol)).pipe(
      map(snapshot => {
        const list = snapshot.docs
          .map(d => d.data() as Teams)
          .sort((a, b) => Number(a.id) - Number(b.id));
        this.teams.set(list);
        return list;
      }),
      catchError(error => {
        console.error('Error al obtener la lista de Equipos:', error);
        return throwError(() => new Error('Error en el servicio.'));
      })
    );
  }

  getTeamById(teamID: number | string): Observable<Teams> {
    const teamRef = doc(firestoreDb, 'teams', String(teamID));
    return from(getDoc(teamRef)).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          throw new Error('No se pudo encontrar el equipo.');
        }
        return docSnap.data() as Teams;
      }),
      catchError(error => {
        console.error(`Error al obtener el equipo con ID ${teamID}:`, error);
        return throwError(() => new Error('No se pudo encontrar el equipo.'));
      })
    );
  }

  addPlayerToTeam(teamId: number, newPlayer: Player): Observable<Teams> {
    return this.getTeamById(teamId).pipe(
      switchMap((team) => {
        team.squad.push(newPlayer);
        return this.updateTeam(team);
      }),
      catchError(error => {
        console.error('Error al agregar jugador:', error);
        return throwError(() => new Error('No se pudo guardar el jugador.'));
      })
    );
  }

  updateTeam(updatedTeam: Teams): Observable<Teams> {
    const teamRef = doc(firestoreDb, 'teams', String(updatedTeam.id));
    const cleanTeam: Teams = JSON.parse(JSON.stringify({
      ...updatedTeam,
      id: String(updatedTeam.id)
    }));

    return from(setDoc(teamRef, cleanTeam)).pipe(
      map(() => {
        const newTeams = this.teams().map(t =>
          Number(t.id) === Number(cleanTeam.id) ? cleanTeam : t
        );
        this.teams.set(newTeams);
        return cleanTeam;
      }),
      catchError(error => {
        console.error('Error al actualizar equipo:', error);
        return throwError(() => new Error('No se pudo actualizar el equipo.'));
      })
    );
  }

  deletePlayerFromTeam(teamId: number, playerId: number): Observable<Teams> {
    return this.getTeamById(teamId).pipe(
      switchMap((team) => {
        const updatedSquad = team.squad.filter(p => Number(p.id) !== Number(playerId));
        team.squad = updatedSquad;
        return this.updateTeam(team);
      }),
      catchError(error => {
        console.error('Error al eliminar jugador:', error);
        return throwError(() => new Error('No se pudo eliminar.'));
      })
    );
  }

  updatePlayer(teamId: number, updatedPlayer: Player): Observable<Teams> {
    return this.getTeamById(teamId).pipe(
      switchMap((team) => {
        const index = team.squad.findIndex(p => Number(p.id) === Number(updatedPlayer.id));

        if (index !== -1) {
          team.squad[index] = updatedPlayer;
          return this.updateTeam(team);
        } else {
          return throwError(() => new Error('Jugador no encontrado en este equipo'));
        }
      }),
      catchError(error => {
        console.error('Error al actualizar jugador:', error);
        return throwError(() => error);
      })
    );
  }
}


  



 






