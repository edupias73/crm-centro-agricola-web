import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { API_CONFIG } from '../../../../api.config';
import { AtendimentoService, AtendimentoResumo } from '../../../../atendimento.service';
import { WebsocketService } from '../../../../websocket.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private atendimentoService = inject(AtendimentoService);
  private wsService = inject(WebsocketService);

  abaAtiva: 'MEUS' | 'FILA' | 'FECHADOS' = 'MEUS';

  meusAtendimentos: AtendimentoResumo[] = [];
  filaAtendimentos: AtendimentoResumo[] = [];
  fechadosAtendimentos: AtendimentoResumo[] = [];

  carregando = true;
  erro = false;
  selecionadoId: number | null = null;
  termoBusca = '';

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.carregar(true);

    // Recarrega silenciosamente quando uma ação ocorre (envio, transferência, fecho)
    this.atendimentoService.recarregar$.subscribe(() => this.carregar(false));

    // Recarrega silenciosamente quando chega mensagem nova via WebSocket
    this.wsService.mensagens$.subscribe(() => this.carregar(false));
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

  abrir(item: AtendimentoResumo) {
    this.selecionadoId = item.id;
    this.atendimentoService.selecionar(item);
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
    return new Date(dataIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}