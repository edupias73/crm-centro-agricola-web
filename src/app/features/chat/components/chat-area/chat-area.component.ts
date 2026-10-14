import {
  Component,
  OnInit,
  OnDestroy,
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
import { forkJoin, Subscription } from 'rxjs';
import { WebsocketService } from '../../../../websocket.service';
import { AtendimentoService, AtendimentoResumo } from '../../../../atendimento.service';
import { ConfiguracaoService } from '../../../../configuracao.service';
import { API_CONFIG } from '../../../../api.config';

interface MensagemView {
  id?: number;
  remetenteTipo: string;
  tipoMensagem?: string;
  conteudo: string;
  mediaUrl?: string | null;
  mimeType?: string | null;
  nomeArquivo?: string | null;
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

interface PlantillaMeta {
  id: string;
  nome: string;
  categoria: string;
  previa: string;
  custoGuaranies: string;
}

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-area.component.html',
})
export class ChatAreaComponent implements OnInit, OnDestroy {
  private wsService = inject(WebsocketService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private http = inject(HttpClient);
  private atendimentoService = inject(AtendimentoService);
  private configService = inject(ConfiguracaoService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('areaMensagens') areaMensagens?: ElementRef<HTMLDivElement>;
  @ViewChild('inputArquivo') inputArquivo?: ElementRef<HTMLInputElement>;

  selecionado: AtendimentoResumo | null = null;
  mensagens: MensagemView[] = [];
  mensagemDigitada = '';
  enviando = false;
  fechando = false;
  alertaWsVisivel = false;

  // --- Permissões e SLA vindos do Admin ---
  slaMinutos = 40;
  podeTransferir = true;
  podeFechar = true;
  exigirMotivoTransferencia = true;
  cierreObligatorioConMotivo = true;
  motivosCierreDisponiveis: string[] = [];
  usuarioPerfil = 'VENDEDOR';
  usuarioNome = 'Rafael De Felice';

  // --- Paginação e Cache ---
  paginaAtual = 0;
  ultimaPagina = false;
  carregandoMais = false;
  carregandoHistorico = false;
  private cacheConversas = new Map<number, CacheConversa>();
  private cacheFichas = new Map<number, FichaCliente>();

  // --- Multimídia (Áudio, Fotos, Vídeos e PDFs) ---
  menuAnexoAberto = false;
  gravandoAudio = false;
  tempoGravacaoSegundos = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerGravacao: any = null;

  // --- Janela 24h e Plantillas (Foto 2 e Foto 4) ---
  forcarJanela24hFechada = false;
  plantillaSelecionada: PlantillaMeta | null = null;
  plantillas: PlantillaMeta[] = [
    {
      id: 'promo_insumos_campana',
      nome: 'promo_insumos_campana',
      categoria: 'Marketing',
      previa:
        'Hola {{1}}, ya está disponible la línea de insumos para la campaña. Respondé este mensaje y te paso precios.',
      custoGuaranies: '₲ 4.900',
    },
    {
      id: 'recordatorio_pedido',
      nome: 'recordatorio_pedido',
      categoria: 'Utilidad',
      previa: 'Hola {{1}}, tu pedido {{2}} está listo para retirar en sucursal.',
      custoGuaranies: '₲ 2.100',
    },
    {
      id: 'seguimiento_presupuesto',
      nome: 'seguimiento_presupuesto',
      categoria: 'Utilidad',
      previa: 'Hola {{1}}, ¿pudiste revisar el presupuesto que te enviamos?',
      custoGuaranies: '₲ 2.100',
    },
    {
      id: 'codigo_acceso_crm',
      nome: 'codigo_acceso_crm',
      categoria: 'Autenticación',
      previa: 'Tu código de acceso es {{1}}. Vence en 10 minutos.',
      custoGuaranies: '₲ 1.700',
    },
  ];

  // --- Ficha do Cliente (Foto 4) ---
  fichaAberta = false;
  carregandoFicha = false;
  editandoFicha = false;
  salvandoFicha = false;
  ficha: FichaCliente | null = null;

  // --- Modal de Transferência (Foto 3) ---
  modalAberto = false;
  motivosTransferenciaChips = [
    'Cliente mayorista',
    'Cliente minorista',
    'Fuera de mi horario',
    'Especialidad técnica',
    'Pedido del cliente',
  ];
  vendedores: VendedorCarga[] = [];
  carregandoVendedores = false;
  destinoSelecionadoId: number | null = null;
  motivo = 'Cliente mayorista';
  notaInterna = '';
  transferindo = false;

  // --- Modal de Motivo de Fechamento (Tags y cierres) ---
  modalFecharAberto = false;
  motivoFechamentoSelecionado = 'Venta concretada';

  private requisicaoHistoricoSub?: Subscription;
  private subs = new Subscription();

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const dados = JSON.parse(atob(base64));
          this.usuarioPerfil = dados.perfil || 'VENDEDOR';
          if (dados.sub) {
            const base = dados.sub.split('@')[0];
            this.usuarioNome = base.charAt(0).toUpperCase() + base.slice(1);
          }
        } catch {
          // Mantém valores padrão
        }
      }
    }

    this.subs.add(
      this.configService.regras$.subscribe((regras) => {
        this.slaMinutos = regras.tempoLimiteMinutos;
        this.podeTransferir = this.usuarioPerfil === 'ADMIN' || regras.vendedorPodeTransferir;
        this.podeFechar = this.usuarioPerfil === 'ADMIN' || regras.vendedorPodeFechar;
        this.exigirMotivoTransferencia = regras.exigirMotivoTransferencia;
        this.cierreObligatorioConMotivo = regras.cierreObligatorioConMotivo;
        this.motivosCierreDisponiveis = regras.motivosCierre;
        if (this.motivosCierreDisponiveis.length > 0) {
          this.motivoFechamentoSelecionado = this.motivosCierreDisponiveis[0];
        }
        this.cdr.detectChanges();
      }),
    );

    this.subs.add(
      this.atendimentoService.selecionado$.subscribe((atendimento) => {
        if (!atendimento) {
          this.selecionado = null;
          this.mensagens = [];
          this.cdr.detectChanges();
          return;
        }

        this.selecionado = atendimento;
        this.editandoFicha = false;
        this.menuAnexoAberto = false;
        this.forcarJanela24hFechada = false;

        const emCache = this.cacheConversas.get(atendimento.id);
        if (emCache) {
          this.mensagens = [...emCache.mensagens];
          this.paginaAtual = emCache.pagina;
          this.ultimaPagina = emCache.ultima;
          this.carregandoHistorico = false;
          this.cdr.detectChanges();
          this.scrollParaBaixo();
        } else {
          this.mensagens = [];
          this.paginaAtual = 0;
          this.ultimaPagina = false;
          this.carregandoHistorico = true;
          this.cdr.detectChanges();
          this.carregarHistoricoPaginado(atendimento.id, 0);
        }

        if (this.fichaAberta) {
          this.carregarFicha(atendimento.id);
        }
      }),
    );

    this.subs.add(
      this.wsService.mensagens$.subscribe((novaMensagem: any) => {
        this.zone.run(() => {
          const idDaConversa = novaMensagem?.atendimentoId ?? novaMensagem?.atendimento?.id;
          if (!idDaConversa) return;

          const novaView: MensagemView = {
            id: novaMensagem.id,
            remetenteTipo: novaMensagem.remetenteTipo,
            tipoMensagem: novaMensagem.tipoMensagem,
            conteudo: novaMensagem.conteudo,
            mediaUrl: novaMensagem.mediaUrl,
            mimeType: novaMensagem.mimeType,
            nomeArquivo: novaMensagem.nomeArquivo,
            hora: novaMensagem.criadoEm
              ? this.formatarHora(novaMensagem.criadoEm)
              : this.horaAgora(),
          };

          if (novaView.tipoMensagem === 'AUDITORIA') {
            this.cacheFichas.delete(idDaConversa);
          }

          if (this.selecionado && idDaConversa === this.selecionado.id) {
            if (novaView.remetenteTipo === 'CLIENTE') {
              this.alertaWsVisivel = true;
            }

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
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.requisicaoHistoricoSub?.unsubscribe();
    this.pararTimerGravacao();
  }

  get janela24hFechada(): boolean {
    if (!this.selecionado) return false;
    if (this.forcarJanela24hFechada || this.selecionado.status === 'FECHADO') return true;
    if (!this.selecionado.ultimaInteracao) return false;
    const diffHoras = (Date.now() - new Date(this.selecionado.ultimaInteracao).getTime()) / 3600000;
    return diffHoras >= 24;
  }

  get minutosEsperaAtual(): number {
    if (!this.selecionado?.ultimaInteracao) return 4;
    const diff = Date.now() - new Date(this.selecionado.ultimaInteracao).getTime();
    return Math.max(1, Math.floor(diff / 60000));
  }

  // --- PAGINAÇÃO E SCROLL ---

  aoRolarChat(event: any) {
    const el = event.target as HTMLElement;
    if (
      el.scrollTop < 50 &&
      !this.ultimaPagina &&
      !this.carregandoMais &&
      !this.carregandoHistorico &&
      this.selecionado
    ) {
      this.carregarHistoricoPaginado(this.selecionado.id, this.paginaAtual + 1);
    }
  }

  private carregarHistoricoPaginado(id: number, page: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (page > 0 && this.carregandoMais) return;

    if (page === 0) {
      this.requisicaoHistoricoSub?.unsubscribe();
      this.carregandoHistorico = true;
    } else {
      this.carregandoMais = true;
    }

    this.requisicaoHistoricoSub = this.http
      .get<
        PageSpring<any>
      >(`${API_CONFIG.baseUrl}/api/atendimentos/${id}/mensagens?page=${page}&size=50`)
      .subscribe({
        next: (pageData) => {
          if (!this.selecionado || this.selecionado.id !== id) {
            return;
          }

          const novasMapeadas: MensagemView[] = pageData.content
            .map((m) => ({
              id: m.id,
              remetenteTipo: m.remetenteTipo,
              tipoMensagem: m.tipoMensagem,
              conteudo: m.conteudo,
              mediaUrl: m.mediaUrl,
              mimeType: m.mimeType,
              nomeArquivo: m.nomeArquivo,
              hora: this.formatarHora(m.criadoEm),
            }))
            .reverse();

          this.paginaAtual = pageData.number;
          this.ultimaPagina = pageData.last;

          if (page === 0) {
            this.mensagens = novasMapeadas;
            this.atualizarCache(id);
            this.carregandoHistorico = false;
            this.cdr.detectChanges();
            this.scrollParaBaixo();
          } else {
            const el = this.areaMensagens?.nativeElement;
            const scrollAnterior = el ? el.scrollHeight - el.scrollTop : 0;

            this.mensagens = [...novasMapeadas, ...this.mensagens];
            this.atualizarCache(id);
            this.carregandoMais = false;
            this.cdr.detectChanges();

            setTimeout(() => {
              if (el) el.scrollTop = el.scrollHeight - scrollAnterior;
            }, 0);
          }
        },
        error: (e) => {
          console.error('Erro ao carregar histórico paginado', e);
          this.carregandoMais = false;
          this.carregandoHistorico = false;
          this.cdr.detectChanges();
        },
      });
  }

  private atualizarCache(id: number) {
    if (this.cacheConversas.size > 30) {
      const primeiraChave = this.cacheConversas.keys().next().value;
      if (primeiraChave !== undefined) {
        this.cacheConversas.delete(primeiraChave);
      }
    }
    this.cacheConversas.set(id, {
      mensagens: [...this.mensagens],
      pagina: this.paginaAtual,
      ultima: this.ultimaPagina,
    });
  }

  // --- ENVIO DE TEXTO, PLANTILLAS E MULTIMÍDIA (ÁUDIO, FOTO, VÍDEO, PDF) ---

  enviarMensagem() {
    const texto = this.mensagemDigitada.trim();
    if (!texto || !this.selecionado || this.enviando) return;

    this.dispararEnvioBackend({
      conteudo: texto,
      tipoMensagem: 'TEXTO',
    });
    this.mensagemDigitada = '';
  }

  enviarPlantillaReabertura() {
    if (!this.selecionado || !this.plantillaSelecionada || this.enviando) return;

    const nomeCliente = this.selecionado.nomeCliente || 'Cliente';
    const textoFormatado = this.plantillaSelecionada.previa
      .replace('{{1}}', nomeCliente)
      .replace('{{2}}', '#1042');

    this.dispararEnvioBackend({
      conteudo: `📋 [Plantilla: ${this.plantillaSelecionada.nome}] ${textoFormatado}`,
      tipoMensagem: 'TEXTO',
    });

    this.forcarJanela24hFechada = false;
    this.plantillaSelecionada = null;
  }

  abrirSeletorArquivo(accept: string) {
    this.menuAnexoAberto = false;
    const input = this.inputArquivo?.nativeElement;
    if (!input) return;
    input.accept = accept;
    input.value = '';
    input.click();
  }

  aoSelecionarArquivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selecionado) return;

    // Limite de segurança de 15MB
    if (file.size > 15 * 1024 * 1024) {
      alert('El archivo supera el límite de 15 MB permitido por WhatsApp.');
      return;
    }

    const mime = file.type || 'application/octet-stream';
    let tipoMensagem = 'DOCUMENTO';
    if (mime.startsWith('image/')) tipoMensagem = 'IMAGEM';
    else if (mime.startsWith('video/')) tipoMensagem = 'VIDEO';
    else if (mime.startsWith('audio/')) tipoMensagem = 'AUDIO';

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const legenda =
        this.mensagemDigitada.trim() || this.gerarLegendaPadrao(tipoMensagem, file.name);
      this.mensagemDigitada = '';

      this.dispararEnvioBackend({
        conteudo: legenda,
        tipoMensagem,
        mediaUrl: dataUrl,
        mimeType: mime,
        nomeArquivo: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  async alternarGravacaoAudio() {
    if (!isPlatformBrowser(this.platformId) || !this.selecionado) return;

    if (this.gravandoAudio) {
      this.finalizarGravacaoAudio(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (this.audioChunks.length === 0) return;

        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64Audio = reader.result as string;
          this.zone.run(() => {
            this.dispararEnvioBackend({
              conteudo: '🎵 Nota de voz',
              tipoMensagem: 'AUDIO',
              mediaUrl: base64Audio,
              mimeType: 'audio/webm',
              nomeArquivo: `voz_${Date.now()}.webm`,
            });
          });
        };
        reader.readAsDataURL(blob);
      };

      this.mediaRecorder.start();
      this.gravandoAudio = true;
      this.tempoGravacaoSegundos = 0;
      this.timerGravacao = setInterval(() => {
        this.tempoGravacaoSegundos++;
        this.cdr.detectChanges();
      }, 1000);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Microfone indisponível:', err);
      alert(
        'No se pudo acceder al micrófono. También podés adjuntar un archivo de audio en el botón (+).',
      );
    }
  }

  cancelarGravacaoAudio() {
    this.audioChunks = [];
    this.finalizarGravacaoAudio(false);
  }

  private finalizarGravacaoAudio(enviar: boolean) {
    this.pararTimerGravacao();
    if (!enviar) {
      this.audioChunks = [];
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.gravandoAudio = false;
    this.cdr.detectChanges();
  }

  private pararTimerGravacao() {
    if (this.timerGravacao) {
      clearInterval(this.timerGravacao);
      this.timerGravacao = null;
    }
  }

  private gerarLegendaPadrao(tipo: string, nomeArquivo: string): string {
    if (tipo === 'IMAGEM') return `📷 Imagen (${nomeArquivo})`;
    if (tipo === 'VIDEO') return `🎬 Video (${nomeArquivo})`;
    if (tipo === 'AUDIO') return `🎵 Audio (${nomeArquivo})`;
    return `📄 ${nomeArquivo}`;
  }

  private dispararEnvioBackend(payload: {
    conteudo: string;
    tipoMensagem: string;
    mediaUrl?: string;
    mimeType?: string;
    nomeArquivo?: string;
  }) {
    if (!this.selecionado) return;
    const atendimentoId = this.selecionado.id;
    this.enviando = true;

    const msgOtimista: MensagemView = {
      remetenteTipo: 'VENDEDOR',
      tipoMensagem: payload.tipoMensagem,
      conteudo: payload.conteudo,
      mediaUrl: payload.mediaUrl,
      mimeType: payload.mimeType,
      nomeArquivo: payload.nomeArquivo,
      hora: this.horaAgora(),
    };

    this.mensagens.push(msgOtimista);
    this.atualizarCache(atendimentoId);
    this.cdr.detectChanges();
    this.scrollParaBaixo();

    this.http
      .post<any>(`${API_CONFIG.baseUrl}/api/atendimentos/${atendimentoId}/mensagens`, payload)
      .subscribe({
        next: (msgSalva) => {
          this.enviando = false;
          msgOtimista.id = msgSalva.id;
          if (this.selecionado && this.selecionado.status !== 'ABERTO') {
            this.selecionado.status = 'ABERTO';
          }
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao enviar mensagem:', e);
          this.enviando = false;
          this.mensagens = this.mensagens.filter((m) => m !== msgOtimista);
          this.atualizarCache(atendimentoId);
          this.cdr.detectChanges();
          alert('No se pudo enviar el mensaje. Verificá tu conexión.');
        },
      });
  }

  // --- FICHA DO CLIENTE (FOTO 4) ---

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
          alert('No se pudo guardar la ficha del cliente.');
        },
      });
  }

  // --- FECHAR ATENDIMENTO (COM OU SEM TABULAÇÃO OBRIGATÓRIA) ---

  iniciarFechamentoAtendimento() {
    if (!this.selecionado || this.fechando || this.selecionado.status === 'FECHADO') return;
    if (this.cierreObligatorioConMotivo && this.motivosCierreDisponiveis.length > 0) {
      this.modalFecharAberto = true;
      this.cdr.detectChanges();
      return;
    }
    this.confirmarFechamentoAtendimento();
  }

  confirmarFechamentoAtendimento() {
    if (!this.selecionado || this.fechando) return;
    this.fechando = true;
    this.modalFecharAberto = false;
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
          alert('No se pudo cerrar la atención.');
        },
      });
  }

  usarRespostaRapida(texto: string) {
    this.mensagemDigitada = texto;
  }

  // --- TRANSFERÊNCIA INTELIGENTE ENTRE SETORES (FOTO 3) ---

  abrirTransferencia() {
    if (!this.selecionado || !this.podeTransferir) return;
    this.modalAberto = true;
    this.destinoSelecionadoId = null;
    this.motivo = 'Cliente mayorista';
    this.notaInterna = '';
    this.carregarTodosVendedoresDisponiveis();
  }

  fecharTransferencia() {
    this.modalAberto = false;
  }

  selecionarChipMotivo(chip: string) {
    this.motivo = chip;
    this.reordenarVendedoresPorMotivo();
  }

  carregarTodosVendedoresDisponiveis() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.carregandoVendedores = true;
    this.vendedores = [];
    this.destinoSelecionadoId = null;
    this.cdr.detectChanges();

    const base = API_CONFIG.baseUrl;
    forkJoin({
      atacado: this.http.get<VendedorCarga[]>(`${base}/api/usuarios/disponiveis?setor=Atacado`),
      varejo: this.http.get<VendedorCarga[]>(`${base}/api/usuarios/disponiveis?setor=Varejo`),
    }).subscribe({
      next: ({ atacado, varejo }) => {
        this.vendedores = [...atacado, ...varejo];
        this.reordenarVendedoresPorMotivo();
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

  private reordenarVendedoresPorMotivo() {
    const priorizarMayorista = this.motivo.toLowerCase().includes('mayorista');
    const priorizarMinorista = this.motivo.toLowerCase().includes('minorista');

    this.vendedores.sort((a, b) => {
      if (priorizarMayorista) {
        const aMay = a.setor === 'Atacado' || a.setor === 'Mayorista' ? 0 : 1;
        const bMay = b.setor === 'Atacado' || b.setor === 'Mayorista' ? 0 : 1;
        if (aMay !== bMay) return aMay - bMay;
      } else if (priorizarMinorista) {
        const aMin = a.setor === 'Varejo' || a.setor === 'Minorista' ? 0 : 1;
        const bMin = b.setor === 'Varejo' || b.setor === 'Minorista' ? 0 : 1;
        if (aMin !== bMin) return aMin - bMin;
      }
      return a.quantidadeAtendimentos - b.quantidadeAtendimentos;
    });

    if (this.vendedores.length > 0 && !this.destinoSelecionadoId) {
      this.destinoSelecionadoId = this.vendedores[0].id;
    }
  }

  nomeSetorEspanhol(setor: string): string {
    if (!setor) return 'Minorista';
    if (setor.toLowerCase() === 'atacado') return 'Mayorista';
    if (setor.toLowerCase() === 'varejo') return 'Minorista';
    return setor;
  }

  confirmarTransferencia() {
    if (!this.selecionado || !this.destinoSelecionadoId) return;
    if (this.exigirMotivoTransferencia && !this.motivo.trim()) {
      alert('Por favor, seleccioná un motivo para transferir.');
      return;
    }

    this.transferindo = true;
    this.cdr.detectChanges();

    const body = {
      destinoId: this.destinoSelecionadoId,
      motivo: this.motivo,
      notaInterna: this.notaInterna,
    };

    this.http
      .post(`${API_CONFIG.baseUrl}/api/atendimentos/${this.selecionado.id}/transferir`, body, {
        responseType: 'text',
      })
      .subscribe({
        next: () => {
          this.transferindo = false;
          this.modalAberto = false;
          this.selecionado = null;
          this.mensagens = [];
          this.fichaAberta = false;
          this.atendimentoService.selecionar(null);
          this.atendimentoService.recarregarLista();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao transferir', e);
          this.transferindo = false;
          this.cdr.detectChanges();
          alert('No se pudo transferir la atención. Intentá de nuevo.');
        },
      });
  }

  // --- UTILITÁRIOS ---

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

  formatarTempoGravacao(seg: number): string {
    const m = Math.floor(seg / 60)
      .toString()
      .padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
