import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // No servidor (SSR), deixa passar e avalia no navegador
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    // Decodifica o payload do JWT para ler o Perfil
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const dados = JSON.parse(atob(base64));
    const perfil = dados.perfil;

    // RBAC: Se a rota começar com /admin e o perfil NÃO for ADMIN, bloqueia e chuta pro chat
    if (state.url.startsWith('/admin') && perfil !== 'ADMIN') {
      console.warn('🔒 Acesso negado: Vendedor não pode acessar o painel Admin.');
      router.navigate(['/chat']);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Erro ao processar token no Guard', e);
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};