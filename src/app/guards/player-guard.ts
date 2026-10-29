import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';

export const PlayerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  const user = auth.getUser();
  
  if (user && user.role === 'admin') {
    router.navigate(['/menuAdmin']); 
    return false;
  }

  return true;
};