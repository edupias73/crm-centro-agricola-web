import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ChatLayout } from './features/chat/chat-layout/chat-layout';
import { AdminComponent } from './features/admin/admin.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'chat', component: ChatLayout, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
];