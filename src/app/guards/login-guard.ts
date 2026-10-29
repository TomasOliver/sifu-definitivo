import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth-service'; 

export const LoginGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLogged()) {
    const user = auth.getUser();
    router.navigate([user?.role === 'admin' ? '/menuAdmin' : '/menu']); 
    return false; 
  }
  return true;
};