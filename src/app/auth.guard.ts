import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const partes = token.split('.');
    if (partes.length !== 3) {
      throw new Error('Token JWT malformado');
    }

    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const dados = JSON.parse(atob(base64));

    if (dados.exp && dados.exp * 1000 <= Date.now()) {
      localStorage.removeItem('token');
      router.navigate(['/login']);
      return false;
    }

    const perfil = dados.perfil;
    if (state.url.startsWith('/admin') && perfil !== 'ADMIN') {
      router.navigate(['/chat']);
      return false;
    }

    return true;
  } catch (e) {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};
