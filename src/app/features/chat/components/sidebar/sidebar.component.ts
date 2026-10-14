import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject, Subscription, interval } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { API_CONFIG } from '../../../../api.config';
import {
  AtendimentoService,
  AtendimentoResumo,
  parseDataUtcMs,
} from '../../../../atendimento.service';
import { WebsocketService } from '../../../../websocket.service';
import { ConfiguracaoService } from '../../../../configuracao.service';

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
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private atendimentoService = inject(AtendimentoService);
  private wsService = inject(WebsocketService);
  private configService = inject(ConfiguracaoService);

  modoSidebar: 'ATENCIONES' | 'CLIENTES' = 'ATENCIONES';
  abaAtiva: 'MEUS' | 'FILA' | 'FECHADOS' = 'MEUS';

  meusAtendimentos: AtendimentoResumo[] = [];
  filaAtendimentos: AtendimentoResumo[] = [];
  fechadosAtendimentos: AtendimentoResumo[] = [];

  naoLidasMap = new Map<number, number>();

  clientes: ClienteCarteira[] = [];
  carregandoClientes = false;

  carregando = true;
  erro = false;
  selecionadoId: number | null = null;
  termoBusca = '';

  slaMinutos = 40;
  stickyAtiva = true;

  private gatilhoRecarregar$ = new Subject<void>();
  private subs = new Subscription();

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.carregar(true);

    this.subs.add(
      this.configService.regras$.subscribe((regras) => {
        this.slaMinutos = regras.tempoLimiteMinutos;
        this.stickyAtiva = regras.stickySessionAtiva;
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.atendimentoService.modoSidebar$.subscribe((modo) => {
        this.modoSidebar = modo;
        if (modo === 'CLIENTES') {
          this.carregarMeusClientes();
        }
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.atendimentoService.selecionado$.subscribe((sel) => {
        this.selecionadoId = sel?.id ?? null;
        if (this.selecionadoId) {
          this.naoLidasMap.set(this.selecionadoId, 0);
        }
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.wsService.mensagens$.subscribe((novaMsg: any) => {
        const idConversa = novaMsg?.atendimentoId ?? novaMsg?.atendimento?.id;
        if (idConversa) {
          if (novaMsg.remetenteTipo === 'CLIENTE') {
            const atual = this.naoLidasMap.get(idConversa) ?? 0;
            this.naoLidasMap.set(idConversa, atual + 1);

            const item = [...this.meusAtendimentos, ...this.filaAtendimentos].find(
              (a) => a.id === idConversa,
            );
            if (item && item.status === 'RESPONDIDO') {
              item.status = 'ABERTO';
              item.ultimaInteracao = new Date().toISOString();
              item.esperaMin = 0;
            }
          } else if (novaMsg.remetenteTipo === 'VENDEDOR') {
            this.naoLidasMap.set(idConversa, 0);
          }
          this.cdr.detectChanges();
        }
        this.gatilhoRecarregar$.next();
      }),
    );

    this.subs.add(
      this.gatilhoRecarregar$.pipe(debounceTime(150)).subscribe(() => {
        this.carregar(false);
        if (this.modoSidebar === 'CLIENTES') {
          this.carregarMeusClientes();
        }
      }),
    );

    this.subs.add(
      this.atendimentoService.recarregar$.subscribe(() => this.gatilhoRecarregar$.next()),
    );

    // Timer isolado de 15s (sem duplicar com wsService.mensagens$)
    this.subs.add(
      interval(15000).subscribe(() => {
        this.gatilhoRecarregar$.next();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  qtdNaoLidas(atendimentoId: number): number {
    return this.naoLidasMap.get(atendimentoId) ?? 0;
  }

  mudarAba(aba: 'MEUS' | 'FILA' | 'FECHADOS') {
    this.abaAtiva = aba;
    this.cdr.detectChanges();
  }

  carregar(mostrarLoading = false) {
    if (mostrarLoading) {
      this.carregando = true;
    }
    this.erro = false;
    this.cdr.detectChanges();

    const base = API_CONFIG.baseUrl;

    forkJoin({
      meus: this.http.get<AtendimentoResumo[]>(`${base}/api/atendimentos/meus`),
      fila: this.http.get<AtendimentoResumo[]>(`${base}/api/atendimentos/fila`),
      fechados: this.http.get<AtendimentoResumo[]>(`${base}/api/atendimentos/fechados`),
    }).subscribe({
      next: ({ meus, fila, fechados }) => {
        this.meusAtendimentos = meus;
        this.filaAtendimentos = fila;
        this.fechadosAtendimentos = fechados;
        this.carregando = false;

        if (!this.selecionadoId && this.meusAtendimentos.length > 0) {
          this.abrir(this.meusAtendimentos[0]);
        } else if (this.selecionadoId) {
          const atualizado = [...meus, ...fila, ...fechados].find(
            (x) => x.id === this.selecionadoId,
          );
          const atual = this.atendimentoService.selecionadoAtual;
          if (atualizado && atual) {
            atual.status = atualizado.status;
            atual.ultimaInteracao = atualizado.ultimaInteracao;
            atual.esperaMin = atualizado.esperaMin;
            atual.nomeCliente = atualizado.nomeCliente;
          }
        }

        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Erro ao carregar atendimentos', e);
        this.erro = true;
        this.carregando = false;
        this.cdr.detectChanges();
      },
    });
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

  get listaDaAbaAtual(): AtendimentoResumo[] {
    if (this.abaAtiva === 'FILA') return this.filaAtendimentos;
    if (this.abaAtiva === 'FECHADOS') return this.fechadosAtendimentos;
    return this.meusAtendimentos;
  }

  get atendimentosFiltrados(): AtendimentoResumo[] {
    const lista = this.listaDaAbaAtual;
    const termo = this.termoBusca.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter(
      (a) =>
        a.nomeCliente?.toLowerCase().includes(termo) ||
        a.telefoneCliente?.toLowerCase().includes(termo),
    );
  }

  get clientesFiltrados(): ClienteCarteira[] {
    const termo = this.termoBusca.trim().toLowerCase();
    if (!termo) return this.clientes;
    return this.clientes.filter(
      (c) =>
        c.nome?.toLowerCase().includes(termo) ||
        c.telefone?.toLowerCase().includes(termo),
    );
  }

  abrir(item: AtendimentoResumo) {
    this.selecionadoId = item.id;
    this.naoLidasMap.set(item.id, 0);
    this.atendimentoService.selecionar(item);
  }

  abrirClienteDaCarteira(c: ClienteCarteira) {
    this.selecionadoId = c.ultimoAtendimentoId;
    this.naoLidasMap.set(c.ultimoAtendimentoId, 0);
    this.atendimentoService.selecionar({
      id: c.ultimoAtendimentoId,
      nomeCliente: c.nome,
      telefoneCliente: c.telefone,
      status: c.statusUltimoAtendimento,
      ultimaInteracao: c.ultimoContato,
    });
  }

  minutosEspera(dataIso: string): number {
    const item = [...this.meusAtendimentos, ...this.filaAtendimentos].find(
      (a) => a.ultimaInteracao === dataIso,
    );
    if (item && typeof item.esperaMin === 'number') {
      return item.esperaMin;
    }
    if (!dataIso) return 0;
    const diff = Date.now() - parseDataUtcMs(dataIso);
    return Math.max(0, Math.floor(diff / 60000));
  }

  nivelEspera(item: AtendimentoResumo): 'OK' | 'RISCO' | 'ATRASADO' | 'RESPONDIDO' | 'FECHADO' {
    if (item.status === 'FECHADO') return 'FECHADO';
    if (item.status === 'RESPONDIDO') return 'RESPONDIDO';
    if (item.status === 'ATRASADO') return 'ATRASADO';
    const min =
      typeof item.esperaMin === 'number'
        ? item.esperaMin
        : this.minutosEspera(item.ultimaInteracao);
    if (min >= this.slaMinutos) return 'ATRASADO';
    if (min >= Math.floor(this.slaMinutos / 2)) return 'RISCO';
    return 'OK';
  }

  iniciais(nome: string): string {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }

  hora(dataIso: string): string {
    if (!dataIso) return '';
    return new Date(parseDataUtcMs(dataIso)).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}