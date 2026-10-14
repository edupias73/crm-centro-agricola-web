import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { ChatAreaComponent } from '../components/chat-area/chat-area.component';
import { AtendimentoService } from '../../../atendimento.service';
import { WebsocketService } from '../../../websocket.service';
import { ConfiguracaoService } from '../../../configuracao.service';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, ChatAreaComponent],
  templateUrl: './chat-layout.html',
})
export class ChatLayout implements OnInit, OnDestroy {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private atendimentoService = inject(AtendimentoService);
  private wsService = inject(WebsocketService);
  private configService = inject(ConfiguracaoService);

  abaSuperior: 'ATENCIONES' | 'CLIENTES' = 'ATENCIONES';
  menuMobileAberto = false;
  emTelaCheia = false;
  idioma: 'ES' | 'PT' = 'ES';

  usuarioEmail = '';
  usuarioPerfil = '';
  usuarioSetor = 'Minorista';

  private subs = new Subscription();

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
        this.usuarioPerfil = dados.perfil || 'VENDEDOR';
        this.usuarioSetor = dados.setor || 'Minorista';
      } catch (e) {
        console.error('Não foi possível ler o token', e);
      }
    }

    this.subs.add(
      this.atendimentoService.modoSidebar$.subscribe((modo) => {
        this.abaSuperior = modo;
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.atendimentoService.selecionado$.subscribe((sel) => {
        if (sel && this.menuMobileAberto) {
          this.menuMobileAberto = false;
          this.cdr.detectChanges();
        }
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  toggleTelaCheia() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          this.emTelaCheia = true;
          this.cdr.detectChanges();
        })
        .catch((err) => console.error('Erro ao ativar tela cheia:', err));
    } else {
      document.exitFullscreen().then(() => {
        this.emTelaCheia = false;
        this.cdr.detectChanges();
      });
    }
  }

  irParaAtenciones() {
    this.atendimentoService.mudarModoSidebar('ATENCIONES');
  }

  irParaClientes() {
    this.atendimentoService.mudarModoSidebar('CLIENTES');
  }

  get usuarioNome(): string {
    if (!this.usuarioEmail) return 'Vendedor';
    const base = this.usuarioEmail.split('@')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  get subtituloCargo(): string {
    if (this.usuarioPerfil === 'ADMIN') return 'Administrador';
    return `Vendedor · ${this.usuarioSetor}`;
  }

  toggleMenu() {
    this.menuMobileAberto = !this.menuMobileAberto;
  }

  voltarAoAdmin() {
    this.router.navigate(['/admin']);
  }

  sair() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.wsService.desconectar();
    this.atendimentoService.selecionar(null);
    this.router.navigate(['/login']);
  }

  iniciais(texto: string): string {
    if (!texto) return '?';
    const partes = texto.trim().split(/\s+/);
    if (partes.length > 1) {
      return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return texto.substring(0, 2).toUpperCase();
  }
}
