import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { ChatAreaComponent } from '../components/chat-area/chat-area.component';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ChatAreaComponent],
  templateUrl: './chat-layout.html',
})
export class ChatLayout implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  menuMobileAberto = false;

  usuarioEmail = '';
  usuarioPerfil = '';

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // O token tem 3 partes separadas por ponto; a do meio são os dados (payload)
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const dados = JSON.parse(atob(base64));
      this.usuarioEmail = dados.sub || '';
      this.usuarioPerfil = dados.perfil || '';
    } catch (e) {
      console.error('Não foi possível ler o token', e);
    }
  }

  // Mostra só a parte antes do @ (ex.: "eduardo@..." -> "eduardo")
  get usuarioNome(): string {
    return this.usuarioEmail ? this.usuarioEmail.split('@')[0] : 'Usuário';
  }

  toggleMenu() {
    this.menuMobileAberto = !this.menuMobileAberto;
  }

  sair() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.router.navigate(['/login']);
  }

  iniciais(texto: string): string {
    if (!texto) return '?';
    return texto.substring(0, 2).toUpperCase();
  }
}