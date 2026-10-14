import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ChatLayout } from './features/chat/chat-layout/chat-layout';
import { AdminComponent } from './features/admin/admin.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'chat', component: ChatLayout, canActivate: [authGuard] },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/pages/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'conversaciones',
        loadComponent: () =>
          import('./features/admin/pages/conversaciones/admin-conversaciones.component').then(
            (m) => m.AdminConversacionesComponent,
          ),
      },
      {
        path: 'iniciar',
        loadComponent: () =>
          import('./features/admin/pages/iniciar/admin-iniciar.component').then(
            (m) => m.AdminIniciarComponent,
          ),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/admin/pages/clientes/admin-clientes.component').then(
            (m) => m.AdminClientesComponent,
          ),
      },
      {
        path: 'marketing',
        loadComponent: () =>
          import('./features/admin/pages/marketing/admin-marketing.component').then(
            (m) => m.AdminMarketingComponent,
          ),
      },
      {
        path: 'costos',
        loadComponent: () =>
          import('./features/admin/pages/costos/admin-costos.component').then(
            (m) => m.AdminCostosComponent,
          ),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/admin/pages/configuracion/admin-configuracion.component').then(
            (m) => m.AdminConfiguracionComponent,
          ),
      },
    ],
  },
];
