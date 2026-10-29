import { Injectable } from '@angular/core';
import { Observable, catchError, finalize, from, map, of, shareReplay, switchMap } from 'rxjs';
import { Saves } from '../models/saves';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { firestoreDb } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class SavesService {
  private readonly savesCol = collection(firestoreDb, 'saves');
  private pendingUpdate$: Observable<Saves | null> | null = null;

  createSave(newSave: Saves): Observable<Saves> {
    const cleanSave: Saves = JSON.parse(JSON.stringify({
      ...newSave,
      id: String(newSave.id),
      userId: String(newSave.userId)
    }));
    const saveRef = doc(firestoreDb, 'saves', String(cleanSave.id));
    return from(setDoc(saveRef, cleanSave)).pipe(
      map(() => cleanSave)
    );
  }

  updateSave(save: Saves): Observable<Saves> {
    const cleanSave: Saves = JSON.parse(JSON.stringify({
      ...save,
      id: String(save.id),
      userId: String(save.userId)
    }));
    const saveRef = doc(firestoreDb, 'saves', String(cleanSave.id));

    const shared$: Observable<Saves> = from(setDoc(saveRef, cleanSave)).pipe(
      map(() => cleanSave),
      finalize(() => {
        if (this.pendingUpdate$ === shared$) {
          this.pendingUpdate$ = null;
        }
      }),
      shareReplay(1)
    );

    this.pendingUpdate$ = shared$;
    return shared$;
  }

  getSaveById(id: string | number): Observable<Saves> {
    const wait$ = this.pendingUpdate$
      ? this.pendingUpdate$.pipe(catchError(() => of(null)))
      : of(null);

    return wait$.pipe(
      switchMap(() => {
        const saveRef = doc(firestoreDb, 'saves', String(id));
        return from(getDoc(saveRef)).pipe(
          map(docSnap => {
            if (!docSnap.exists()) {
              throw new Error('Partida no encontrada');
            }
            return docSnap.data() as Saves;
          })
        );
      })
    );
  }

  getSavesByUserId(userId: string | number): Observable<Saves[]> {
    const wait$ = this.pendingUpdate$
      ? this.pendingUpdate$.pipe(catchError(() => of(null)))
      : of(null);

    return wait$.pipe(
      switchMap(() => {
        const q = query(this.savesCol, where('userId', '==', String(userId)));
        return from(getDocs(q)).pipe(
          map(snapshot => snapshot.docs.map(d => d.data() as Saves))
        );
      })
    );
  }

  deleteSave(id: string | number): Observable<void> {
    const saveRef = doc(firestoreDb, 'saves', String(id));
    return from(deleteDoc(saveRef));
  }

}