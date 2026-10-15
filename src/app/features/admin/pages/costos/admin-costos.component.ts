import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { AdminApiService, RelatorioCustosMeta, CustoVendedor } from '../../admin-api.service';
import { WebsocketService } from '../../../../websocket.service';

@Component({
  selector: 'app-admin-costos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">
        Control de gastos · Tarifario Oficial Meta (01/10/2026)
      </p>
      <div class="flex items-start justify-between flex-wrap gap-4 mt-1">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Costos de mensajes</h1>
          <p class="text-xs text-gray-500 mt-1">
            Cobro por mensaje entregado en Paraguay (+595): Primeros 1.000 mensajes de servicio/mes gratis (₲ 0); excedente y plantillas de Utilidad/Auth a ₲ 90 ($0.0113 USD) · Marketing a ₲ 580 ($0.0740 USD).
          </p>
        </div>

        <div class="flex bg-white border border-gray-200 rounded-lg p-1 text-xs">
          <button
            (click)="mudarPeriodo('MES')"
            [ngClass]="periodo === 'MES' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'"
            class="px-3 py-1 rounded-md"
          >
            Este mes
          </button>
          <button
            (click)="mudarPeriodo('ANTERIOR')"
            [ngClass]="periodo === 'ANTERIOR' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'"
            class="px-3 py-1 rounded-md"
          >
            Mes anterior
          </button>
          <button
            (click)="mudarPeriodo('ANO')"
            [ngClass]="periodo === 'ANO' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'"
            class="px-3 py-1 rounded-md"
          >
            Año
          </button>
        </div>
      </div>

      <!-- 4 KPI Cards (Foto 6 + Regra 01/10/2026) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Gasto total estimado (Meta)</span>
          <p class="text-2xl font-bold text-gray-900 mt-2">
            ₲ {{ formatarNumero(dados?.gastoTotalGuaranies ?? 0) }}
          </p>
          <p class="text-xs text-gray-400 mt-1">
            ≈ USD {{ converterParaUsd(dados?.gastoTotalGuaranies ?? 0) }} este período
          </p>
        </div>

        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Mensajes enviados</span>
          <p class="text-2xl font-bold text-gray-900 mt-2">
            {{ formatarNumero(dados?.totalMensagensEnviadas ?? 0) }}
          </p>
          <p class="text-xs text-green-700 font-medium mt-1">
            {{ formatarNumero(dados?.servicoGratisUsadas ?? 0) }} gratis (franquia 1k) · {{ formatarNumero(dados?.totalMensagensPagas ?? 0) }} tarifados
          </p>
        </div>

        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Costo promedio por msj pago</span>
          <p class="text-2xl font-bold text-gray-900 mt-2">
            ₲ {{ formatarNumero(dados?.custoMedioPorMensagemPaga ?? 90) }}
          </p>
          <p class="text-xs text-gray-400 mt-1">mezcla de categorías Meta</p>
        </div>

        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Presupuesto del mes</span>
          <p class="text-2xl font-bold text-green-700 mt-2">{{ percentualOrcamento }}%</p>
          <p class="text-xs text-gray-400 mt-1">
            ₲ {{ formatarNumero(dados?.gastoTotalGuaranies ?? 0) }} de ₲ {{ formatarNumero(dados?.orcamentoMensalGuaranies ?? 2000000) }}
          </p>
        </div>
      </div>

      <!-- Franquia Mensal de 1.000 Mensagens de Serviço Grátis (Nova Regra 01/10/2026) -->
      <div class="bg-white rounded-xl border border-green-200 p-5 mt-5 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-gray-900">
                Franquicia mensual de Servicio (Ventana de 24 h)
              </h2>
              <span class="px-2 py-0.5 bg-green-50 text-green-800 text-[10px] font-bold rounded uppercase">
                Regla Meta 01/10/2026
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-0.5">
              Los primeros 1.000 mensajes de respuesta libre enviados en el mes son gratuitos (₲ 0). A partir del mensaje 1.001, Meta cobra ₲ 90 ($0.0113 USD) por mensaje entregado.
            </p>
          </div>
          <div class="text-right shrink-0">
            <span class="text-sm font-extrabold font-mono text-green-800">
              {{ dados?.servicoGratisUsadas ?? 0 }} / {{ dados?.franquiaMensalServico ?? 1000 }} gratis
            </span>
            @if ((dados?.servicoExcedenteCobradas ?? 0) > 0) {
              <p class="text-[11px] text-amber-700 font-bold">
                +{{ dados?.servicoExcedenteCobradas }} excedentes (₲ {{ formatarNumero(dados?.custoServicoGuaranies ?? 0) }})
              </p>
            }
          </div>
        </div>
        <div class="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full transition-all duration-300 rounded-full"
            [ngClass]="percentualFranquia >= 100 ? 'bg-amber-500' : 'bg-green-600'"
            [style.width.%]="percentualFranquia"
          ></div>
        </div>
      </div>

      <!-- Gasto por categoría (Marketing, Utilidad, Autenticación) -->
      <div class="bg-white rounded-xl border border-gray-200/80 p-5 mt-5 shadow-sm">
        <h2 class="text-sm font-bold text-gray-900 mb-4">Gasto por categoría de plantilla (Paraguay)</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-gray-800">Marketing (₲ 580 / $0.0740)</span>
              <span class="font-bold text-gray-900 font-mono">
                ₲ {{ formatarNumero(dados?.custoMktGuaranies ?? 0) }}
              </span>
            </div>
            <div class="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div class="h-full rounded-full bg-orange-600" [style.width.%]="pctCategoria(dados?.custoMktGuaranies ?? 0)"></div>
            </div>
            <div class="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>{{ dados?.mktCount ?? 0 }} mensajes entregados</span>
              <span>{{ pctCategoria(dados?.custoMktGuaranies ?? 0) }}%</span>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-gray-800">Utilidad (₲ 90 / $0.0113)</span>
              <span class="font-bold text-gray-900 font-mono">
                ₲ {{ formatarNumero(dados?.custoUtilGuaranies ?? 0) }}
              </span>
            </div>
            <div class="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div class="h-full rounded-full bg-green-700" [style.width.%]="pctCategoria(dados?.custoUtilGuaranies ?? 0)"></div>
            </div>
            <div class="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>{{ dados?.utilCount ?? 0 }} mensajes entregados</span>
              <span>{{ pctCategoria(dados?.custoUtilGuaranies ?? 0) }}%</span>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-gray-800">Autenticación (₲ 90 / $0.0113)</span>
              <span class="font-bold text-gray-900 font-mono">
                ₲ {{ formatarNumero(dados?.custoAuthGuaranies ?? 0) }}
              </span>
            </div>
            <div class="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div class="h-full rounded-full bg-green-700" [style.width.%]="pctCategoria(dados?.custoAuthGuaranies ?? 0)"></div>
            </div>
            <div class="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>{{ dados?.authCount ?? 0 }} mensajes entregados</span>
              <span>{{ pctCategoria(dados?.custoAuthGuaranies ?? 0) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Gasto por vendedor real -->
      <div class="bg-white rounded-xl border border-gray-200/80 p-5 mt-5 shadow-sm overflow-x-auto">
        <h2 class="text-sm font-bold text-gray-900">Gasto por vendedor</h2>
        <p class="text-xs text-gray-400 mb-4">
          Mensajes de servicio (24h) y plantillas enviadas por cada miembro del equipo
        </p>

        <div class="min-w-[740px]">
          <div
            class="grid grid-cols-[35px_1.6fr_0.5fr_0.5fr_0.5fr_0.7fr_0.7fr_1fr_1fr] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-2 pb-2.5 border-b border-gray-100"
          >
            <span>#</span>
            <span>Vendedor</span>
            <span>Mkt</span>
            <span>Util</span>
            <span>Auth</span>
            <span>Serv (24h)</span>
            <span>Total msj</span>
            <span>Participación</span>
            <span class="text-right">Gasto Plantillas</span>
          </div>

          @for (v of dados?.porVendedor ?? []; track v.id; let i = $index) {
            <div
              class="grid grid-cols-[35px_1.6fr_0.5fr_0.5fr_0.5fr_0.7fr_0.7fr_1fr_1fr] gap-x-4 items-center px-2 py-3 border-b border-gray-50"
            >
              <span class="text-xs text-gray-400">{{ i + 1 }}</span>
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0"
                >
                  {{ iniciais(v.nome) }}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-gray-900 truncate">{{ v.nome }}</p>
                  <p class="text-[10px] text-gray-400">{{ v.sector }}</p>
                </div>
              </div>
              <span class="text-xs font-mono text-orange-700 font-semibold">{{ v.mkt }}</span>
              <span class="text-xs font-mono text-green-700 font-semibold">{{ v.util }}</span>
              <span class="text-xs font-mono text-gray-500">{{ v.auth }}</span>
              <span class="text-xs font-mono text-green-700">{{ v.servico24h }}</span>
              <span class="text-xs font-mono font-bold text-gray-900">{{ v.totalMensagens }}</span>
              <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-green-700 rounded-full"
                  [style.width.%]="pctVendedor(v)"
                ></div>
              </div>
              <span class="text-xs font-mono font-bold text-gray-900 text-right">
                ₲ {{ formatarNumero(v.gastoPlantillasGuaranies) }}
              </span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminCostosComponent implements OnInit, OnDestroy {
  private api = inject(AdminApiService);
  private wsService = inject(WebsocketService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  periodo: 'MES' | 'ANTERIOR' | 'ANO' = 'MES';
  dados: RelatorioCustosMeta | null = null;
  private subs = new Subscription();

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.carregar();

    this.subs.add(
      this.wsService.pulsoTempoReal$.subscribe(() => {
        this.carregar();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  mudarPeriodo(novo: 'MES' | 'ANTERIOR' | 'ANO') {
    this.periodo = novo;
    this.carregar();
  }

  carregar() {
    this.api.obterCustosMeta(this.periodo).subscribe((rel) => {
      this.dados = rel;
      this.cdr.detectChanges();
    });
  }

  get percentualOrcamento(): number {
    if (!this.dados || !this.dados.orcamentoMensalGuaranies) return 0;
    return Math.min(
      100,
      Math.round((this.dados.gastoTotalGuaranies / this.dados.orcamentoMensalGuaranies) * 100),
    );
  }

  get percentualFranquia(): number {
    if (!this.dados || !this.dados.franquiaMensalServico) return 0;
    return Math.min(
      100,
      Math.round((this.dados.servicoGratisUsadas / this.dados.franquiaMensalServico) * 100),
    );
  }

  pctCategoria(valor: number): number {
    const total = this.dados?.gastoTotalGuaranies ?? 0;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((valor / total) * 100));
  }

  pctVendedor(v: CustoVendedor): number {
    const total = this.dados?.totalMensagensEnviadas ?? 0;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((v.totalMensagens / total) * 100));
  }

  formatarNumero(n: number): string {
    return (n || 0).toLocaleString('es-PY');
  }

  converterParaUsd(guaranies: number): string {
    return ((guaranies || 0) / 7800).toFixed(2);
  }

  iniciais(nome: string): string {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
}