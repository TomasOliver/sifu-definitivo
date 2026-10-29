// src/app/services/game.service.ts
import { Injectable, signal } from '@angular/core';
import { Match } from '../models/match';
import { generateRoundRobinMatches } from '../utils/generate-matches';

const STORAGE_KEY = 'my_game_fixture_v1';

@Injectable({ providedIn: 'root' })
export class GameService {
  // fixture (signals para reactividad)
  matches = signal<Match[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  // Crea y guarda un fixture nuevo.
  
  createFixture(teamIds: number[], includeReturnLeg = true) {
    const fixture = generateRoundRobinMatches(teamIds, includeReturnLeg);
    this.matches.set(fixture);
    this.saveToStorage();
  }

  // Recupera fixture guardado (si existe) 
  loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed: Match[] = JSON.parse(raw);
      this.matches.set(parsed);
    } catch (e) {
      console.error('Error parsing fixture from storage', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.matches()));
    } catch (e) {
      console.error('No se pudo guardar fixture', e);
    }
  }

  updateMatchResult(matchId: number, homeGoals: number, awayGoals: number) {
    this.matches.update(list =>
      list.map(m =>
        m.id === matchId ? { ...m, homeGoals, awayGoals, played: true } : m
      )
    );
    this.saveToStorage();
  }

  addMatchEvent(matchId: number, event: { minute: number; type: 'goal' | 'assist' | 'yellow' | 'red'; playerId: number; teamId: number }) {
    this.matches.update(list =>
      list.map(m =>
        m.id === matchId ? { ...m, events: [...m.events, event] } : m
      )
    );
    this.saveToStorage();
  }

  getMatchdays(): number[] {
    const set = new Set<number>(this.matches().map(m => m.matchday));
    return Array.from(set).sort((a, b) => a - b);
  }

  getMatchesByMatchday(matchday: number): Match[] {
    return this.matches().filter(m => m.matchday === matchday).sort((a, b) => a.id - b.id);
  }

  clearFixture() {
    this.matches.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }
}
