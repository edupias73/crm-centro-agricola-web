import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  inject,
  PLATFORM_ID,
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

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-area.component.html',
})
export class ChatAreaComponent implements OnInit {
  private wsService = inject(WebsocketService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private atendimentoService = inject(AtendimentoService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('areaMensagens') areaMensagens?: ElementRef<HTMLDivElement>;

  selecionado: AtendimentoResumo | null = null;
  mensagens: MensagemView[] = [];
  mensagemDigitada = '';
  enviando = false;
  fechando = false;

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
      this.carregarHistorico(atendimento.id);
    });

    this.wsService.mensagens$.subscribe((novaMensagem: any) => {
      const idDaConversa = novaMensagem?.atendimento?.id;
      if (!this.selecionado || idDaConversa !== this.selecionado.id) {
        return;
      }

      if (novaMensagem.id && this.mensagens.some((m) => m.id === novaMensagem.id)) {
        return;
      }

      this.mensagens.push({
        id: novaMensagem.id,
        remetenteTipo: novaMensagem.remetenteTipo,
        tipoMensagem: novaMensagem.tipoMensagem,
        conteudo: novaMensagem.conteudo,
        hora: novaMensagem.criadoEm
          ? this.formatarHora(novaMensagem.criadoEm)
          : this.horaAgora(),
      });

      this.cdr.detectChanges();
      this.scrollParaBaixo();
    });
  }

  private carregarHistorico(id: number) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http
      .get<any[]>(`${API_CONFIG.baseUrl}/api/atendimentos/${id}/mensagens`)
      .subscribe({
        next: (lista) => {
          this.mensagens = lista.map((m) => ({
            id: m.id,
            remetenteTipo: m.remetenteTipo,
            tipoMensagem: m.tipoMensagem,
            conteudo: m.conteudo,
            hora: this.formatarHora(m.criadoEm),
          }));
          this.cdr.detectChanges();
          this.scrollParaBaixo();
        },
        error: (e) => {
          console.error('Erro ao carregar histórico', e);
          this.mensagens = [];
          this.cdr.detectChanges();
        },
      });
  }

  enviarMensagem() {
    const texto = this.mensagemDigitada.trim();
    if (!texto || !this.selecionado || this.enviando) return;

    this.enviando = true;
    const atendimentoId = this.selecionado.id;
    const payload = {
      conteudo: texto,
      tipoMensagem: 'TEXTO',
    };

    this.mensagemDigitada = '';

    this.http
      .post<any>(`${API_CONFIG.baseUrl}/api/atendimentos/${atendimentoId}/mensagens`, payload)
      .subscribe({
        next: (msgSalva) => {
          if (!this.mensagens.some((m) => m.id === msgSalva.id)) {
            this.mensagens.push({
              id: msgSalva.id,
              remetenteTipo: msgSalva.remetenteTipo,
              tipoMensagem: msgSalva.tipoMensagem,
              conteudo: msgSalva.conteudo,
              hora: msgSalva.criadoEm ? this.formatarHora(msgSalva.criadoEm) : this.horaAgora(),
            });
          }
          if (this.selecionado && this.selecionado.status !== 'ABERTO') {
            this.selecionado.status = 'ABERTO';
          }
          this.enviando = false;
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
          this.scrollParaBaixo();
        },
        error: (e) => {
          console.error('Erro ao enviar mensagem:', e);
          this.mensagemDigitada = texto;
          this.enviando = false;
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

  // ---- Transferência ----
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