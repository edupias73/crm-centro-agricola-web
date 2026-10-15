import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_CONFIG } from './api.config';

export interface ConfiguracaoSlaBackend {
  id?: number;
  tempoLimiteMinutos: number;
  primeiraRespostaMinutos?: number;
  ociosidadeMinutos?: number;
  toleranciaForaExpedienteMinutos?: number;
  transbordoAutomatico: boolean;
  stickySessionAtiva?: boolean;
  duracaoStickyDias?: number;
  maximoAtendimentosPorVendedor?: number;
  respeitarSetorCliente?: boolean;
  bloquearDesconectados?: boolean;
  vendedorPodeTransferir?: boolean;
  vendedorPodeFechar?: boolean;
  exigirMotivoTransferencia?: boolean;
  cierreObligatorioConMotivo?: boolean;
  motivosCierreLista?: string;
  msgSaludoInicial?: string;
  msgConfirmacionAsignacion?: string;
  orcamentoMensalGuaranies?: number;
  ativo: boolean;
  atualizadoEm?: string;
}

export interface RegrasOperacionais {
  tempoLimiteMinutos: number;
  primeiraRespostaMinutos: number;
  ociosidadeMinutos: number;
  toleranciaForaExpedienteMinutos: number;
  transbordoAutomatico: boolean;
  stickySessionAtiva: boolean;
  duracaoStickyDias: number;
  maximoAtendimentosPorVendedor: number;
  respeitarSetorCliente: boolean;
  bloquearDesconectados: boolean;
  vendedorPodeTransferir: boolean;
  vendedorPodeFechar: boolean;
  exigirMotivoTransferencia: boolean;
  cierreObligatorioConMotivo: boolean;
  motivosCierre: string[];
  msgSaludoInicial?: string;
  msgConfirmacionAsignacion?: string;
  orcamentoMensalGuaranies?: number;
}

const CHAVE_STORAGE = 'crm_regras_operacionais_v1';

const REGRAS_PADRAO: RegrasOperacionais = {
  tempoLimiteMinutos: 40,
  primeiraRespostaMinutos: 5,
  ociosidadeMinutos: 15,
  toleranciaForaExpedienteMinutos: 90,
  transbordoAutomatico: true,
  stickySessionAtiva: true,
  duracaoStickyDias: 30,
  maximoAtendimentosPorVendedor: 6,
  respeitarSetorCliente: true,
  bloquearDesconectados: false,
  vendedorPodeTransferir: true,
  vendedorPodeFechar: true,
  exigirMotivoTransferencia: true,
  cierreObligatorioConMotivo: true,
  motivosCierre: [
    'Venta concretada',
    'Presupuesto enviado',
    'Sin stock disponible',
    'Cliente no respondió',
    'Solo consulta técnica',
    'Precio no aceptado',
  ],
  msgSaludoInicial:
    '¡Hola! Bienvenido a Centro Agrícola. 🌾\nPor favor, elegí una opción:\n\n1 - Mayorista (Atacado)\n2 - Minorista (Varejo)',
  msgConfirmacionAsignacion:
    '✅ ¡Todo listo! Te va a atender {{vendedor}}, de nuestro equipo de {{sector}}. En breve te responde.',
  orcamentoMensalGuaranies: 2000000,
};

@Injectable({ providedIn: 'root' })
export class ConfiguracaoService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private regrasSubject = new BehaviorSubject<RegrasOperacionais>(this.lerDoStorage());
  regras$ = this.regrasSubject.asObservable();

  get regrasAtuais(): RegrasOperacionais {
    return this.regrasSubject.value;
  }

  private lerDoStorage(): RegrasOperacionais {
    if (!isPlatformBrowser(this.platformId)) {
      return { ...REGRAS_PADRAO };
    }
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) {
        return { ...REGRAS_PADRAO, ...JSON.parse(salvo) };
      }
    } catch {
      // Usa padrão se falhar leitura
    }
    return { ...REGRAS_PADRAO };
  }

  private aplicarDadosDoBackend(sla: ConfiguracaoSlaBackend): void {
    if (!sla) return;
    const motivos = sla.motivosCierreLista
      ? sla.motivosCierreLista
          .split('|')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : this.regrasSubject.value.motivosCierre;

    this.atualizarRegrasLocais({
      tempoLimiteMinutos: sla.tempoLimiteMinutos ?? 40,
      primeiraRespostaMinutos: sla.primeiraRespostaMinutos ?? 5,
      ociosidadeMinutos: sla.ociosidadeMinutos ?? 15,
      toleranciaForaExpedienteMinutos: sla.toleranciaForaExpedienteMinutos ?? 90,
      transbordoAutomatico: sla.transbordoAutomatico ?? true,
      stickySessionAtiva: sla.stickySessionAtiva ?? true,
      duracaoStickyDias: sla.duracaoStickyDias ?? 30,
      maximoAtendimentosPorVendedor: sla.maximoAtendimentosPorVendedor ?? 6,
      respeitarSetorCliente: sla.respeitarSetorCliente ?? true,
      bloquearDesconectados: sla.bloquearDesconectados ?? false,
      vendedorPodeTransferir: sla.vendedorPodeTransferir ?? true,
      vendedorPodeFechar: sla.vendedorPodeFechar ?? true,
      exigirMotivoTransferencia: sla.exigirMotivoTransferencia ?? true,
      cierreObligatorioConMotivo: sla.cierreObligatorioConMotivo ?? true,
      motivosCierre: motivos.length > 0 ? motivos : REGRAS_PADRAO.motivosCierre,
      msgSaludoInicial: sla.msgSaludoInicial ?? REGRAS_PADRAO.msgSaludoInicial,
      msgConfirmacionAsignacion:
        sla.msgConfirmacionAsignacion ?? REGRAS_PADRAO.msgConfirmacionAsignacion,
      orcamentoMensalGuaranies: sla.orcamentoMensalGuaranies ?? 2000000,
    });
  }

  carregarSlaDoServidor(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<ConfiguracaoSlaBackend>(`${API_CONFIG.baseUrl}/api/configuracoes/sla`).subscribe({
      next: (sla) => this.aplicarDadosDoBackend(sla),
      error: () => {},
    });
  }

  salvarSlaNoServidor(parcial: Partial<RegrasOperacionais>): Observable<ConfiguracaoSlaBackend> {
    this.atualizarRegrasLocais(parcial);
    const atual = this.regrasSubject.value;

    const payload: ConfiguracaoSlaBackend = {
      tempoLimiteMinutos: atual.tempoLimiteMinutos,
      primeiraRespostaMinutos: atual.primeiraRespostaMinutos,
      ociosidadeMinutos: atual.ociosidadeMinutos,
      toleranciaForaExpedienteMinutos: atual.toleranciaForaExpedienteMinutos,
      transbordoAutomatico: atual.transbordoAutomatico,
      stickySessionAtiva: atual.stickySessionAtiva,
      duracaoStickyDias: atual.duracaoStickyDias,
      maximoAtendimentosPorVendedor: atual.maximoAtendimentosPorVendedor,
      respeitarSetorCliente: atual.respeitarSetorCliente,
      bloquearDesconectados: atual.bloquearDesconectados,
      vendedorPodeTransferir: atual.vendedorPodeTransferir,
      vendedorPodeFechar: atual.vendedorPodeFechar,
      exigirMotivoTransferencia: atual.exigirMotivoTransferencia,
      cierreObligatorioConMotivo: atual.cierreObligatorioConMotivo,
      motivosCierreLista: (atual.motivosCierre || []).join('|'),
      msgSaludoInicial: atual.msgSaludoInicial,
      msgConfirmacionAsignacion: atual.msgConfirmacionAsignacion,
      orcamentoMensalGuaranies: atual.orcamentoMensalGuaranies,
      ativo: true,
    };

    return this.http
      .put<ConfiguracaoSlaBackend>(`${API_CONFIG.baseUrl}/api/configuracoes/sla`, payload)
      .pipe(tap((resp) => this.aplicarDadosDoBackend(resp)));
  }

  atualizarRegrasLocais(parcial: Partial<RegrasOperacionais>): void {
    const novo = { ...this.regrasSubject.value, ...parcial };
    this.regrasSubject.next(novo);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(novo));
      } catch {
        // Ignora quota excedida
      }
    }
  }
}