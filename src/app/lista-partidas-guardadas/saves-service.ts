import { Injectable } from '@angular/core';
import { Observable, catchError, finalize, from, map, of, shareReplay, switchMap } from 'rxjs';
import { Saves } from '../models/saves';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { firestoreDb } from '../firebase.config';

const BACKUP_PREFIX = 'save_backup_';
const MAX_LOCAL_BACKUPS = 5;

@Injectable({
  providedIn: 'root'
})
export class SavesService {
  private readonly savesCol = collection(firestoreDb, 'saves');
  private pendingUpdate$: Observable<Saves | null> | null = null;

  saveLocalBackup(save: Saves): void {
    const key = `${BACKUP_PREFIX}${save.id}`;
    const serialized = JSON.stringify(save);

    try {
      this.pruneOldBackups(String(save.id));
      localStorage.setItem(key, serialized);
    } catch {
      // Si se alcanza el límite de cuota de localStorage, limpiamos backups previos y reintentamos una vez
      try {
        this.clearAllBackupsExcept(String(save.id));
        localStorage.setItem(key, serialized);
      } catch {
        // Ignorar silenciosamente para no interrumpir nunca el guardado en Firestore
      }
    }
  }

  getInstantLocalBackup(id: string | number): Saves | null {
    try {
      const raw = localStorage.getItem(`${BACKUP_PREFIX}${id}`);
      return raw ? (JSON.parse(raw) as Saves) : null;
    } catch {
      return null;
    }
  }

  private pruneOldBackups(keepId: string): void {
    try {
      const entries: { key: string; id: string; time: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(BACKUP_PREFIX)) {
          const id = k.slice(BACKUP_PREFIX.length);
          let time = 0;
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || '{}') as Partial<Saves>;
            time = new Date(parsed.updatedAt ?? 0).getTime();
          } catch {
            time = 0;
          }
          entries.push({ key: k, id, time });
        }
      }

      if (entries.length >= MAX_LOCAL_BACKUPS) {
        entries
          .filter(e => e.id !== keepId)
          .sort((a, b) => a.time - b.time)
          .slice(0, Math.max(1, entries.length - MAX_LOCAL_BACKUPS + 1))
          .forEach(e => localStorage.removeItem(e.key));
      }
    } catch {
      // Ignorar errores de acceso a localStorage
    }
  }

  private clearAllBackupsExcept(keepId: string): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(BACKUP_PREFIX) && k !== `${BACKUP_PREFIX}${keepId}`) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignorar
    }
  }

  createSave(newSave: Saves): Observable<Saves> {
    const cleanSave: Saves = JSON.parse(JSON.stringify({
      ...newSave,
      id: String(newSave.id),
      userId: String(newSave.userId)
    }));
    this.saveLocalBackup(cleanSave);
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
    this.saveLocalBackup(cleanSave);
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

  private mergeWithLocalBackup(save: Saves): Saves {
    try {
      const localSave = this.getInstantLocalBackup(save.id);
      if (!localSave) return save;
      if (String(localSave.userId) !== String(save.userId)) return save;

      const remoteTime = new Date(save.updatedAt ?? 0).getTime();
      const localTime = new Date(localSave.updatedAt ?? 0).getTime();

      if (localTime > remoteTime) {
        // Si un F5 o cierre de pestaña cortó el setDoc anterior, re-sincronizamos la partida con Firestore
        const saveRef = doc(firestoreDb, 'saves', String(localSave.id));
        setDoc(saveRef, localSave).catch(() => {});
        return localSave;
      }
      if (localTime === remoteTime) {
        return localSave;
      }
    } catch {
      // ignorar si localStorage no está disponible o JSON inválido
    }
    return save;
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
            return this.mergeWithLocalBackup(docSnap.data() as Saves);
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
          map(snapshot => snapshot.docs.map(d => this.mergeWithLocalBackup(d.data() as Saves)))
        );
      })
    );
  }

  deleteSave(id: string | number): Observable<void> {
    try {
      localStorage.removeItem(`${BACKUP_PREFIX}${id}`);
    } catch {
      // Ignorar
    }
    const saveRef = doc(firestoreDb, 'saves', String(id));
    return from(deleteDoc(saveRef));
  }

}
