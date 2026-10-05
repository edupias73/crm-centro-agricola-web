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

  // Cache em memória para troca instantânea (0ms) entre conversas
  private cacheMensagens = new Map<number, MensagemView[]>();
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

      // Se já estiver em cache, mostra na tela em 0ms enquanto sincroniza em background
      const emCache = this.cacheMensagens.get(atendimento.id);
      if (emCache) {
        this.mensagens = [...emCache];
        this.cdr.detectChanges();
        this.scrollParaBaixo();
      } else {
        this.mensagens = [];
        this.cdr.detectChanges();
      }

      this.carregarHistorico(atendimento.id);
      if (this.fichaAberta) {
        this.carregarFicha(atendimento.id);
      }
    });

    this.wsService.mensagens$.subscribe((novaMensagem: any) => {
      this.zone.run(() => {
        // Suporta tanto o DTO rápido (atendimentoId) quanto a entidade antiga (atendimento.id)
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

        // Se a conversa estiver aberta na tela agora, adiciona ao vivo
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
            this.cacheMensagens.set(idDaConversa, [...this.mensagens]);
            this.cdr.detectChanges();
            this.scrollParaBaixo();
          }
        } else {
          // Atualiza o cache mesmo se o vendedor estiver olhando outra conversa
          const listaCache = this.cacheMensagens.get(idDaConversa);
          if (listaCache && !listaCache.some((m) => m.id === novaMensagem.id)) {
            listaCache.push(novaView);
          }
        }
      });
    });
  }

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

  private carregarHistorico(id: number) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http
      .get<any[]>(`${API_CONFIG.baseUrl}/api/atendimentos/${id}/mensagens`)
      .subscribe({
        next: (lista) => {
          const mapeadas = lista.map((m) => ({
            id: m.id,
            remetenteTipo: m.remetenteTipo,
            tipoMensagem: m.tipoMensagem,
            conteudo: m.conteudo,
            hora: this.formatarHora(m.criadoEm),
          }));
          this.cacheMensagens.set(id, mapeadas);
          if (this.selecionado?.id === id) {
            this.mensagens = [...mapeadas];
            this.cdr.detectChanges();
            this.scrollParaBaixo();
          }
        },
        error: (e) => {
          console.error('Erro ao carregar histórico', e);
        },
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

    // OPTIMISTIC UI: Mostra o balão verde na tela em 0ms (instantâneo!)
    const msgOtimista: MensagemView = {
      remetenteTipo: 'VENDEDOR',
      tipoMensagem: 'TEXTO',
      conteudo: texto,
      hora: this.horaAgora(),
    };

    this.mensagens.push(msgOtimista);
    this.cacheMensagens.set(atendimentoId, [...this.mensagens]);
    this.mensagemDigitada = '';
    this.cdr.detectChanges();
    this.scrollParaBaixo();

    this.http
      .post<any>(`${API_CONFIG.baseUrl}/api/atendimentos/${atendimentoId}/mensagens`, payload)
      .subscribe({
        next: (msgSalva) => {
          // Vincula o ID oficial gerado pelo MySQL na mensagem que já está na tela
          msgOtimista.id = msgSalva.id;
          if (this.selecionado && this.selecionado.status !== 'ABERTO') {
            this.selecionado.status = 'ABERTO';
          }
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao enviar mensagem:', e);
          // Remove o balão se houve queda de internet e devolve o texto ao input
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
          this.carregarHistorico(id);
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