import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const noNavegador = isPlatformBrowser(platformId);

  // Carimba o token na saída (só no navegador)
  if (noNavegador) {
    const token = localStorage.getItem('token');
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

  return next(req).pipe(
    catchError((erro: HttpErrorResponse) => {
      // O login trata os próprios erros; não mexemos nele aqui
      const ehLogin = req.url.includes('/api/auth/login');

      // Token vencido ou inválido -> desloga e volta pro login
      if (noNavegador && !ehLogin && (erro.status === 401 || erro.status === 403)) {
        localStorage.removeItem('token');
        router.navigate(['/login']);
      }

      return throwError(() => erro);
    }),
  );
};