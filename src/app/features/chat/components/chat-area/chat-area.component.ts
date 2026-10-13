import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  inject,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../../../../websocket.service';
import { AtendimentoService, AtendimentoResumo } from '../../../../atendimento.service';
import { API_CONFIG } from '../../../../api.config';

interface MensagemView {
  id?: number;
  remetenteTipo: string;
  tipoMensagem?: string;
  conteudo: string;
  hora: string;
}

interface PageSpring<T> {
  content: T[];
  last: boolean;
  number: number;
}

interface CacheConversa {
  mensagens: MensagemView[];
  pagina: number;
  ultima: boolean;
}

interface VendedorCarga {
  id: number;
  nome: string;
  setor: string;
  quantidadeAtendimentos: number;
}

interface ItemHistorico {
  atendimentoId: number;
  titulo: string;
  status: string;
  data: string;
}

interface FichaCliente {
  clienteId: number;
  nome: string;
  telefone: string;
  tipoCliente: string;
  estabelecimento: string;
  cidade: string;
  cultivo: string;
  interesseTitulo: string;
  interesseDetalhe: string;
  clienteDesde: string;
  historial: ItemHistorico[];
}

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-area.component.html',
})
export class ChatAreaComponent implements OnInit {
  private wsService = inject(WebsocketService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private http = inject(HttpClient);
  private atendimentoService = inject(AtendimentoService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('areaMensagens') areaMensagens?: ElementRef<HTMLDivElement>;

  selecionado: AtendimentoResumo | null = null;
  mensagens: MensagemView[] = [];
  mensagemDigitada = '';
  enviando = false;
  fechando = false;

  // --- Paginação e Cache ---
  paginaAtual = 0;
  ultimaPagina = false;
  carregandoMais = false;
  private cacheConversas = new Map<number, CacheConversa>();
  private cacheFichas = new Map<number, FichaCliente>();

  // --- Ficha do Cliente ---
  fichaAberta = false;
  carregandoFicha = false;
  editandoFicha = false;
  salvandoFicha = false;
  ficha: FichaCliente | null = null;

  // --- Transferência ---
  modalAberto = false;
  setorTransferencia = 'Atacado';
  vendedores: VendedorCarga[] = [];
  carregandoVendedores = false;
  destinoSelecionadoId: number | null = null;
  motivo = '';
  notaInterna = '';
  transferindo = false;

  ngOnInit() {
    this.atendimentoService.selecionado$.subscribe((atendimento) => {
      this.selecionado = atendimento;
      this.editandoFicha = false;

      const emCache = this.cacheConversas.get(atendimento.id);
      if (emCache) {
        this.mensagens = [...emCache.mensagens];
        this.paginaAtual = emCache.pagina;
        this.ultimaPagina = emCache.ultima;
        this.cdr.detectChanges();
        this.scrollParaBaixo();
      } else {
        this.mensagens = [];
        this.paginaAtual = 0;
        this.ultimaPagina = false;
        this.cdr.detectChanges();
      }

      // Dispara do zero apenas se não houver cache
      if (!emCache) {
        this.carregarHistoricoPaginado(atendimento.id, 0);
      }
      
      if (this.fichaAberta) {
        this.carregarFicha(atendimento.id);
      }
    });

    this.wsService.mensagens$.subscribe((novaMensagem: any) => {
      this.zone.run(() => {
        const idDaConversa = novaMensagem?.atendimentoId ?? novaMensagem?.atendimento?.id;
        if (!idDaConversa) return;

        const novaView: MensagemView = {
          id: novaMensagem.id,
          remetenteTipo: novaMensagem.remetenteTipo,
          tipoMensagem: novaMensagem.tipoMensagem,
          conteudo: novaMensagem.conteudo,
          hora: novaMensagem.criadoEm
            ? this.formatarHora(novaMensagem.criadoEm)
            : this.horaAgora(),
        };

        if (this.selecionado && idDaConversa === this.selecionado.id) {
          const jaExiste =
            (novaMensagem.id && this.mensagens.some((m) => m.id === novaMensagem.id)) ||
            this.mensagens.some(
              (m) =>
                !m.id &&
                m.remetenteTipo === novaView.remetenteTipo &&
                m.conteudo === novaView.conteudo,
            );

          if (!jaExiste) {
            this.mensagens.push(novaView);
            this.atualizarCache(idDaConversa);
            this.cdr.detectChanges();
            this.scrollParaBaixo();
          }
        } else {
          const cacheData = this.cacheConversas.get(idDaConversa);
          if (cacheData && !cacheData.mensagens.some((m) => m.id === novaMensagem.id)) {
            cacheData.mensagens.push(novaView);
          }
        }
      });
    });
  }

  // --- LÓGICA DE PAGINAÇÃO E SCROLL ---
  
  aoRolarChat(event: any) {
    const el = event.target as HTMLElement;
    // Se chegou perto do topo, tenta carregar as mensagens antigas
    if (el.scrollTop < 50 && !this.ultimaPagina && !this.carregandoMais && this.selecionado) {
      this.carregarHistoricoPaginado(this.selecionado.id, this.paginaAtual + 1);
    }
  }

  private carregarHistoricoPaginado(id: number, page: number) {
    if (!isPlatformBrowser(this.platformId) || this.carregandoMais) return;
    this.carregandoMais = true;

    this.http
      .get<PageSpring<any>>(`${API_CONFIG.baseUrl}/api/atendimentos/${id}/mensagens?page=${page}&size=50`)
      .subscribe({
        next: (pageData) => {
          // O Java traz ordenado do mais recente para o antigo (Desc).
          // Para o UI fazer sentido (antigas em cima), invertemos o array.
          const novasMapeadas = pageData.content.map((m) => ({
            id: m.id,
            remetenteTipo: m.remetenteTipo,
            tipoMensagem: m.tipoMensagem,
            conteudo: m.conteudo,
            hora: this.formatarHora(m.criadoEm),
          })).reverse();

          this.paginaAtual = pageData.number;
          this.ultimaPagina = pageData.last;

          if (page === 0) {
            this.mensagens = novasMapeadas;
            this.atualizarCache(id);
            this.cdr.detectChanges();
            this.scrollParaBaixo();
          } else {
            // Guarda a posição atual do scroll para o ecrã não "saltar" ao colocar mensagens em cima
            const el = this.areaMensagens?.nativeElement;
            const scrollAnterior = el ? el.scrollHeight - el.scrollTop : 0;

            this.mensagens = [...novasMapeadas, ...this.mensagens];
            this.atualizarCache(id);
            this.cdr.detectChanges();

            setTimeout(() => {
              if (el) el.scrollTop = el.scrollHeight - scrollAnterior;
            }, 0);
          }
          this.carregandoMais = false;
        },
        error: (e) => {
          console.error('Erro ao carregar histórico paginado', e);
          this.carregandoMais = false;
        },
      });
  }

  private atualizarCache(id: number) {
    this.cacheConversas.set(id, {
      mensagens: [...this.mensagens],
      pagina: this.paginaAtual,
      ultima: this.ultimaPagina
    });
  }

  // --- RESTANTE DO CÓDIGO (FICHA E AÇÕES) MANTIDO INTACTO ---

  toggleFichaCliente() {
    this.fichaAberta = !this.fichaAberta;
    if (this.fichaAberta && this.selecionado) {
      this.carregarFicha(this.selecionado.id);
    }
    this.cdr.detectChanges();
  }

  carregarFicha(atendimentoId: number) {
    if (!isPlatformBrowser(this.platformId)) return;

    const fichaCache = this.cacheFichas.get(atendimentoId);
    if (fichaCache) {
      this.ficha = fichaCache;
      this.carregandoFicha = false;
      this.cdr.detectChanges();
    } else {
      this.carregandoFicha = true;
      this.cdr.detectChanges();
    }

    this.http
      .get<FichaCliente>(`${API_CONFIG.baseUrl}/api/atendimentos/${atendimentoId}/ficha`)
      .subscribe({
        next: (dados) => {
          this.ficha = dados;
          this.cacheFichas.set(atendimentoId, dados);
          this.carregandoFicha = false;
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao carregar ficha do cliente', e);
          this.carregandoFicha = false;
          this.cdr.detectChanges();
        },
      });
  }

  salvarFichaCliente() {
    if (!this.selecionado || !this.ficha || this.salvandoFicha) return;
    this.salvandoFicha = true;

    this.http
      .put<FichaCliente>(
        `${API_CONFIG.baseUrl}/api/atendimentos/${this.selecionado.id}/ficha`,
        this.ficha,
      )
      .subscribe({
        next: (fichaAtualizada) => {
          this.ficha = fichaAtualizada;
          if (this.selecionado) {
            this.selecionado.nomeCliente = fichaAtualizada.nome;
            this.cacheFichas.set(this.selecionado.id, fichaAtualizada);
          }
          this.editandoFicha = false;
          this.salvandoFicha = false;
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao salvar ficha', e);
          this.salvandoFicha = false;
          this.cdr.detectChanges();
          alert('Não foi possível salvar a ficha do cliente.');
        },
      });
  }

  anoCliente(dataIso?: string): string {
    if (!dataIso) return '2026';
    return new Date(dataIso).getFullYear().toString();
  }

  formatarDataCurta(dataIso?: string): string {
    if (!dataIso) return '';
    return new Date(dataIso).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  enviarMensagem() {
    const texto = this.mensagemDigitada.trim();
    if (!texto || !this.selecionado) return;

    const atendimentoId = this.selecionado.id;
    const payload = {
      conteudo: texto,
      tipoMensagem: 'TEXTO',
    };

    const msgOtimista: MensagemView = {
      remetenteTipo: 'VENDEDOR',
      tipoMensagem: 'TEXTO',
      conteudo: texto,
      hora: this.horaAgora(),
    };

    this.mensagens.push(msgOtimista);
    this.atualizarCache(atendimentoId);
    this.mensagemDigitada = '';
    this.cdr.detectChanges();
    this.scrollParaBaixo();

    this.http
      .post<any>(`${API_CONFIG.baseUrl}/api/atendimentos/${atendimentoId}/mensagens`, payload)
      .subscribe({
        next: (msgSalva) => {
          msgOtimista.id = msgSalva.id;
          if (this.selecionado && this.selecionado.status !== 'ABERTO') {
            this.selecionado.status = 'ABERTO';
          }
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao enviar mensagem:', e);
          this.mensagens = this.mensagens.filter((m) => m !== msgOtimista);
          this.mensagemDigitada = texto;
          this.cdr.detectChanges();
          alert('Não foi possível enviar a mensagem. Verifique sua conexão.');
        },
      });
  }

  fecharAtendimento() {
    if (!this.selecionado || this.fechando || this.selecionado.status === 'FECHADO') return;

    this.fechando = true;
    const id = this.selecionado.id;

    this.http
      .post(`${API_CONFIG.baseUrl}/api/atendimentos/${id}/fechar`, {}, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.fechando = false;
          if (this.selecionado) {
            this.selecionado.status = 'FECHADO';
          }
          this.carregarHistoricoPaginado(id, 0);
          if (this.fichaAberta) {
            this.carregarFicha(id);
          }
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao fechar atendimento:', e);
          this.fechando = false;
          this.cdr.detectChanges();
          alert('Não foi possível encerrar o atendimento.');
        },
      });
  }

  usarRespostaRapida(texto: string) {
    this.mensagemDigitada = texto;
  }

  abrirTransferencia() {
    if (!this.selecionado) return;
    this.modalAberto = true;
    this.destinoSelecionadoId = null;
    this.motivo = '';
    this.notaInterna = '';
    this.carregarVendedores();
  }

  fecharTransferencia() {
    this.modalAberto = false;
  }

  carregarVendedores() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.carregandoVendedores = true;
    this.vendedores = [];
    this.destinoSelecionadoId = null;
    this.cdr.detectChanges();

    this.http
      .get<VendedorCarga[]>(
        `${API_CONFIG.baseUrl}/api/usuarios/disponiveis?setor=${this.setorTransferencia}`,
      )
      .subscribe({
        next: (lista) => {
          this.vendedores = lista;
          this.carregandoVendedores = false;
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao carregar vendedores', e);
          this.carregandoVendedores = false;
          this.cdr.detectChanges();
        },
      });
  }

  confirmarTransferencia() {
    if (!this.selecionado || !this.destinoSelecionadoId) return;
    this.transferindo = true;
    this.cdr.detectChanges();

    const body = {
      destinoId: this.destinoSelecionadoId,
      motivo: this.motivo,
      notaInterna: this.notaInterna,
    };

    this.http
      .post(
        `${API_CONFIG.baseUrl}/api/atendimentos/${this.selecionado.id}/transferir`,
        body,
        { responseType: 'text' },
      )
      .subscribe({
        next: () => {
          this.transferindo = false;
          this.modalAberto = false;
          this.selecionado = null;
          this.mensagens = [];
          this.fichaAberta = false;
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao transferir', e);
          this.transferindo = false;
          this.cdr.detectChanges();
          alert('Não foi possível transferir. Tente de novo.');
        },
      });
  }

  private scrollParaBaixo() {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      const el = this.areaMensagens?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  iniciais(nome: string | undefined | null): string {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }

  private formatarHora(dataIso: string): string {
    if (!dataIso) return '';
    return new Date(dataIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private horaAgora(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}