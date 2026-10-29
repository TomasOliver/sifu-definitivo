import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';

export const AdminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();

  if (user && user.role === 'admin') {
    return true;
  }
  
  if (user) {
    router.navigate(['/menu']);
  } else {
    router.navigate(['/login']);
  }
  return false;
};