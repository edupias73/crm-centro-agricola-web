import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const noNavegador = isPlatformBrowser(platformId);
  const ehRotaPublica = req.url.includes('/api/auth/login');

  if (noNavegador && !ehRotaPublica) {
    const token = localStorage.getItem('token');
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token.trim()}` },
      });
    }
  }

  return next(req).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (noNavegador && !ehRotaPublica && erro.status === 401) {
        localStorage.removeItem('token');
        router.navigate(['/login']);
      }
      return throwError(() => erro);
    }),
  );
};