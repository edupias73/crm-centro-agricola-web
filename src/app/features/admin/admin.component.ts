import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ConfiguracaoService } from '../../configuracao.service';
import { WebsocketService } from '../../websocket.service';

interface ItemMenu {
  rota: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private configService = inject(ConfiguracaoService);
  private wsService = inject(WebsocketService);

  usuarioEmail = '';
  usuarioPerfil = 'ADMIN';
  idioma: 'ES' | 'PT' = 'ES';
  emTelaCheia = false;
  menuMobileAberto = false;

  menu: ItemMenu[] = [
    {
      rota: 'dashboard',
      label: 'Dashboard',
      icon: 'M4 4h6v6H4V4zM14 4h6v6h-6V4zM4 14h6v6H4v-6zM14 14h6v6h-6v-6z',
    },
    {
      rota: 'conversaciones',
      label: 'Todas las conversacio...',
      icon: 'M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 21l1.8-4A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    },
    { rota: 'iniciar', label: 'Iniciar conversación', icon: 'M12 4v16m8-8H4' },
    {
      rota: 'clientes',
      label: 'Clientes',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
      rota: 'marketing',
      label: 'Marketing',
      icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
    },
    {
      rota: 'costos',
      label: 'Costos de mensajes',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      rota: 'configuracion',
      label: 'Configuración',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.wsService.conectar();
    this.configService.carregarSlaDoServidor();

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const dados = JSON.parse(atob(base64));
        this.usuarioEmail = dados.sub || '';
        this.usuarioPerfil = dados.perfil || 'ADMIN';
      } catch (e) {
        console.error('Erro ao ler token', e);
      }
    }
  }

  get emConfiguracion(): boolean {
    return this.router.url.includes('/admin/configuracion');
  }

  get usuarioNome(): string {
    if (!this.usuarioEmail) return 'Administrador';
    const base = this.usuarioEmail.split('@')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  iniciais(texto: string): string {
    if (!texto) return '?';
    const partes = texto.trim().split(/\s+/);
    const p = partes[0]?.[0] ?? '';
    const u = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (p + u).toUpperCase() || texto.substring(0, 2).toUpperCase();
  }

  toggleTelaCheia() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.emTelaCheia = true;
        this.cdr.detectChanges();
      });
    } else {
      document.exitFullscreen().then(() => {
        this.emTelaCheia = false;
        this.cdr.detectChanges();
      });
    }
  }

  irParaVendedor() {
    this.router.navigate(['/chat']);
  }

  sair() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.wsService.desconectar();
    this.router.navigate(['/login']);
  }
}
