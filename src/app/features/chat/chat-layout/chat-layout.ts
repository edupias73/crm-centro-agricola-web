import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { ChatAreaComponent } from '../components/chat-area/chat-area.component';
import { AtendimentoService } from '../../../atendimento.service';
import { API_CONFIG } from '../../../api.config';

interface ClienteCarteira {
  clienteId: number;
  nome: string;
  telefone: string;
  ultimoContato: string;
  ultimoAtendimentoId: number;
  statusUltimoAtendimento: string;
  totalAtendimentos: number;
}

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, ChatAreaComponent],
  templateUrl: './chat-layout.html',
})
export class ChatLayout implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private atendimentoService = inject(AtendimentoService);

  abaSuperior: 'ATENCIONES' | 'CLIENTES' = 'ATENCIONES';
  menuMobileAberto = false;
  emTelaCheia = false;
  usuarioEmail = '';
  usuarioPerfil = '';

  // --- Estado de "Mis clientes" ---
  clientes: ClienteCarteira[] = [];
  carregandoClientes = false;
  buscaCliente = '';
  editandoId: number | null = null;
  novoNomeTemp = '';
  salvandoNome = false;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const dados = JSON.parse(atob(base64));
      this.usuarioEmail = dados.sub || '';
      this.usuarioPerfil = dados.perfil || '';
    } catch (e) {
      console.error('Não foi possível ler o token', e);
    }
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
    this.abaSuperior = 'ATENCIONES';
    this.cdr.detectChanges();
  }

  irParaClientes() {
    this.abaSuperior = 'CLIENTES';
    this.carregarMeusClientes();
  }

  carregarMeusClientes() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.carregandoClientes = true;
    this.cdr.detectChanges();

    this.http.get<ClienteCarteira[]>(`${API_CONFIG.baseUrl}/api/clientes/meus`).subscribe({
      next: (lista) => {
        this.clientes = lista;
        this.carregandoClientes = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Erro ao carregar clientes', e);
        this.carregandoClientes = false;
        this.cdr.detectChanges();
      },
    });
  }

  get clientesFiltrados(): ClienteCarteira[] {
    const termo = this.buscaCliente.trim().toLowerCase();
    if (!termo) return this.clientes;
    return this.clientes.filter(
      (c) =>
        c.nome?.toLowerCase().includes(termo) ||
        c.telefone?.toLowerCase().includes(termo),
    );
  }

  iniciarEdicaoNome(c: ClienteCarteira) {
    this.editandoId = c.clienteId;
    this.novoNomeTemp = c.nome;
  }

  cancelarEdicaoNome() {
    this.editandoId = null;
    this.novoNomeTemp = '';
  }

  salvarNomeCliente(c: ClienteCarteira) {
    const limpo = this.novoNomeTemp.trim();
    if (!limpo || this.salvandoNome) return;

    this.salvandoNome = true;
    this.http
      .put(
        `${API_CONFIG.baseUrl}/api/clientes/${c.clienteId}/nome`,
        { nome: limpo },
        { responseType: 'text' },
      )
      .subscribe({
        next: (nomeSalvo) => {
          c.nome = nomeSalvo;
          this.editandoId = null;
          this.salvandoNome = false;
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao atualizar nome', e);
          this.salvandoNome = false;
          this.cdr.detectChanges();
          alert('Não foi possível salvar o nome do cliente.');
        },
      });
  }

  abrirChatDoCliente(c: ClienteCarteira) {
    this.abaSuperior = 'ATENCIONES';
    this.cdr.detectChanges();

    setTimeout(() => {
      this.atendimentoService.selecionar({
        id: c.ultimoAtendimentoId,
        nomeCliente: c.nome,
        telefoneCliente: c.telefone,
        status: c.statusUltimoAtendimento,
        ultimaInteracao: c.ultimoContato,
      });
    }, 50);
  }

  get usuarioNome(): string {
    return this.usuarioEmail ? this.usuarioEmail.split('@')[0] : 'Usuário';
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

  formatarData(dataIso: string): string {
    if (!dataIso) return '';
    const d = new Date(dataIso);
    return (
      d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }
}