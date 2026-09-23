import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // No servidor (SSR) não há localStorage; deixa passar e o navegador reavalia.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (localStorage.getItem('token')) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};