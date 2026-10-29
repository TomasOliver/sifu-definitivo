import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Sifu');
  private router = inject(Router);

  private currentUrl = signal<string>('');

  readonly isAuthPage = computed(() => {
    const url = this.currentUrl();
    return url === '/login' || url === '/register';
  });

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl.set(event.urlAfterRedirects);
    });
  }
}
