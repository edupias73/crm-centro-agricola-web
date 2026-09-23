import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../../api.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  senha = '';
  entrando = false;
  erro = '';

  fazerLogin() {
    if (this.entrando) return; // evita clique duplo
    this.entrando = true;
    this.erro = '';

    const payload = { email: this.email, senha: this.senha };

    this.http
      .post(`${API_CONFIG.baseUrl}/api/auth/login`, payload, { responseType: 'text' })
      .subscribe({
        next: (tokenJwt) => {
          localStorage.setItem('token', tokenJwt);
          this.router.navigate([this.rotaPorPerfil(tokenJwt)]);
        },
        error: (e) => {
          console.error('Falha na autenticação (status):', e.status);
          this.erro =
            e.status === 401 || e.status === 403
              ? 'E-mail ou senha inválidos.'
              : 'Não foi possível conectar. Tente novamente.';
          this.entrando = false;
          this.cdr.detectChanges();
        },
      });
  }

  // Admin vai pro painel; os demais, pra tela do vendedor
  private rotaPorPerfil(token: string): string {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const dados = JSON.parse(atob(base64));
      return dados.perfil === 'ADMIN' ? '/admin' : '/chat';
    } catch {
      return '/chat';
    }
  }
}