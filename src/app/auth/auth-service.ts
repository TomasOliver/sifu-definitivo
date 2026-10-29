import { Injectable } from '@angular/core';
import { Users } from '../models/users';
import { Observable, from, map, switchMap, throwError } from 'rxjs';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { firestoreDb } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly usersCol = collection(firestoreDb, 'users');
  private loggedUser?: Users;

  constructor() { }

  login(username: string, password: string): Observable<Users | null> {
    const q = query(this.usersCol, where('username', '==', username));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const users = snapshot.docs
          .map(d => d.data() as Users)
          .filter(u => u.password === password);

        if (users.length > 0) {
          this.loggedUser = users[0];
          localStorage.setItem('user', JSON.stringify(this.loggedUser));
          return users[0];
        }
        return null;
      })
    );
  }

  logout() {
    this.loggedUser = undefined;
    localStorage.removeItem('user');
    localStorage.removeItem('activeSaveId');
  }

  isLogged(): boolean {
    return !!localStorage.getItem('user');
  }

  getUser(): Users | null {
    return JSON.parse(localStorage.getItem('user') || 'null');
  }

  checkUserExists(username: string): Observable<Users[]> {
    const q = query(this.usersCol, where('username', '==', username));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(d => d.data() as Users))
    );
  }

  register(username: string, password: string): Observable<Users> {
    return this.checkUserExists(username).pipe(
      switchMap(users => {
        if (users.length > 0) {
          return throwError(() => 'El usuario ya existe');
        }

        const newUser: Users = {
          id: String(Date.now()),
          username,
          password,
          role: 'player'
        };

        const userRef = doc(firestoreDb, 'users', String(newUser.id));
        return from(setDoc(userRef, newUser)).pipe(
          map(() => newUser)
        );
      })
    );
  }
}