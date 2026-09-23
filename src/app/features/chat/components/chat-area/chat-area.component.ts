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
  remetenteTipo: string;
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
      this.mensagens.push({
        remetenteTipo: novaMensagem.remetenteTipo,
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
            remetenteTipo: m.remetenteTipo,
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
    if (!this.mensagemDigitada.trim()) return;
    this.mensagens.push({
      remetenteTipo: 'VENDEDOR',
      conteudo: this.mensagemDigitada,
      hora: this.horaAgora(),
    });
    this.mensagemDigitada = '';
    this.cdr.detectChanges();
    this.scrollParaBaixo();
  }

  // Preenche o campo de mensagem com uma resposta rápida
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
    // Espera o DOM desenhar as mensagens novas antes de rolar
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