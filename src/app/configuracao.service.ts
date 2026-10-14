import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_CONFIG } from './api.config';

export interface ConfiguracaoSlaBackend {
  id?: number;
  tempoLimiteMinutos: number;
  transbordoAutomatico: boolean;
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
      // Ignora erro de parse e usa padrão
    }
    return { ...REGRAS_PADRAO };
  }

  carregarSlaDoServidor(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<ConfiguracaoSlaBackend>(`${API_CONFIG.baseUrl}/api/configuracoes/sla`).subscribe({
      next: (sla) => {
        if (sla && typeof sla.tempoLimiteMinutos === 'number') {
          this.atualizarRegrasLocais({
            tempoLimiteMinutos: sla.tempoLimiteMinutos,
            transbordoAutomatico: sla.transbordoAutomatico ?? true,
          });
        }
      },
      error: () => {
        // Mantém configuração local se o endpoint ainda estiver subindo
      },
    });
  }

  salvarSlaNoServidor(parcial: Partial<RegrasOperacionais>): Observable<ConfiguracaoSlaBackend> {
    this.atualizarRegrasLocais(parcial);
    const atual = this.regrasSubject.value;

    const payload: ConfiguracaoSlaBackend = {
      tempoLimiteMinutos: atual.tempoLimiteMinutos,
      transbordoAutomatico: atual.transbordoAutomatico,
      ativo: true,
    };

    return this.http
      .put<ConfiguracaoSlaBackend>(`${API_CONFIG.baseUrl}/api/configuracoes/sla`, payload)
      .pipe(
        tap((resp) => {
          if (resp && typeof resp.tempoLimiteMinutos === 'number') {
            this.atualizarRegrasLocais({
              tempoLimiteMinutos: resp.tempoLimiteMinutos,
              transbordoAutomatico: resp.transbordoAutomatico,
            });
          }
        }),
      );
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
