import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService, ClienteAdmin } from '../../admin-api.service';

interface CampanhaHistorico {
  id: number;
  nome: string;
  data: string;
  plantilla: string;
  formato: string;
  enviados: number;
  entregues: number;
  custoTotal: string;
}

@Component({
  selector: 'app-admin-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
      <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Difusión</p>
      <div class="flex items-center justify-between flex-wrap gap-4 mt-1">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Marketing</h1>
          <p class="text-xs text-gray-500 mt-1">
            Enviá una campaña por WhatsApp a tus clientes reales de MySQL usando una plantilla
            aprobada.
          </p>
        </div>

        <div class="flex bg-white border border-gray-200 rounded-xl p-1 text-xs">
          <button
            (click)="aba = 'NUEVA'"
            [ngClass]="aba === 'NUEVA' ? 'bg-green-700 text-white font-bold' : 'text-gray-600'"
            class="px-3.5 py-1.5 rounded-lg transition-all"
          >
            Nueva campaña
          </button>
          <button
            (click)="aba = 'HISTORIAL'"
            [ngClass]="aba === 'HISTORIAL' ? 'bg-green-700 text-white font-bold' : 'text-gray-600'"
            class="px-3.5 py-1.5 rounded-lg transition-all"
          >
            Historial de envíos ({{ historico.length }})
          </button>
        </div>
      </div>

      @if (avisoSucesso) {
        <div
          class="mt-4 p-3.5 bg-green-50 border border-green-200 text-green-800 text-xs font-bold rounded-xl"
        >
          ✅ {{ avisoSucesso }}
        </div>
      }

      @if (aba === 'NUEVA') {
        <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mt-6">
          <div class="flex flex-col gap-6">
            <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
              <h2 class="text-sm font-bold text-gray-900 mb-4">1 · Contenido</h2>

              <div class="flex flex-col gap-4">
                <div>
                  <label class="text-xs text-gray-500 font-medium">Nombre de la campaña</label>
                  <input
                    type="text"
                    [(ngModel)]="nomeCampanha"
                    placeholder="Ej: Campaña insumos septiembre"
                    class="w-full mt-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:border-green-700"
                  />
                </div>

                <div>
                  <label class="text-xs text-gray-500 font-medium block mb-1.5">Formato</label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      (click)="formato = 'imagen'"
                      [ngClass]="
                        formato === 'imagen'
                          ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                          : 'border-gray-200 bg-white text-gray-600'
                      "
                      class="px-3.5 py-1.5 rounded-lg border text-xs"
                    >
                      imagen
                    </button>
                    <button
                      type="button"
                      (click)="formato = 'video'"
                      [ngClass]="
                        formato === 'video'
                          ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                          : 'border-gray-200 bg-white text-gray-600'
                      "
                      class="px-3.5 py-1.5 rounded-lg border text-xs"
                    >
                      video
                    </button>
                    <button
                      type="button"
                      (click)="formato = 'texto'"
                      [ngClass]="
                        formato === 'texto'
                          ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                          : 'border-gray-200 bg-white text-gray-600'
                      "
                      class="px-3.5 py-1.5 rounded-lg border text-xs"
                    >
                      solo texto
                    </button>
                  </div>
                </div>

                @if (formato !== 'texto') {
                  <label
                    class="border-2 border-dashed border-gray-200 hover:border-green-600 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
                  >
                    <input type="file" class="hidden" (change)="aoSelecionarArquivo($event)" />
                    <span
                      class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 mb-2"
                    >
                      ↑
                    </span>
                    <p class="text-xs font-bold text-gray-800">
                      {{ nomeArquivo || 'Arrastrá la imagen de la campaña' }}
                    </p>
                    <p class="text-[11px] text-gray-400 mt-0.5">JPG, PNG o MP4 · hasta 16 MB</p>
                  </label>
                }

                <div>
                  <label class="text-xs text-gray-500 font-medium">Texto del mensaje</label>
                  <textarea
                    rows="3"
                    [(ngModel)]="textoMensagem"
                    class="w-full mt-1 border border-gray-200 rounded-lg p-3 text-xs focus:outline-none focus:border-green-700"
                  ></textarea>
                  <div class="flex gap-2 mt-2">
                    @for (v of variaveisDisponiveis; track v) {
                      <button
                        type="button"
                        (click)="inserirVariavel(v)"
                        class="px-2.5 py-1 bg-green-50 text-green-800 font-mono text-[11px] rounded border border-green-200"
                      >
                        {{ v }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-sm font-bold text-gray-900">2 · Destinatarios (Base real)</h2>
                <span class="text-xs font-bold text-gray-700 font-mono">
                  {{ destinatariosAlvo.length }} seleccionados
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  (click)="publico = 'TODOS'"
                  [ngClass]="
                    publico === 'TODOS'
                      ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                      : 'border-gray-200 text-gray-600'
                  "
                  class="px-3.5 py-2 rounded-lg border text-xs"
                >
                  Todos los clientes ({{ clientes.length }})
                </button>
                <button
                  type="button"
                  (click)="publico = 'MAYORISTAS'"
                  [ngClass]="
                    publico === 'MAYORISTAS'
                      ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                      : 'border-gray-200 text-gray-600'
                  "
                  class="px-3.5 py-2 rounded-lg border text-xs"
                >
                  Solo mayoristas
                </button>
                <button
                  type="button"
                  (click)="publico = 'MINORISTAS'"
                  [ngClass]="
                    publico === 'MINORISTAS'
                      ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                      : 'border-gray-200 text-gray-600'
                  "
                  class="px-3.5 py-2 rounded-lg border text-xs"
                >
                  Solo minoristas
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-5">
            <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
              <h2 class="text-sm font-bold text-gray-900 mb-4">3 · Plantilla de marketing</h2>

              <div
                class="p-3.5 rounded-xl border border-green-700 bg-green-50/30 flex items-center justify-between"
              >
                <div class="flex items-center gap-2.5">
                  <span class="w-3 h-3 rounded-full bg-green-700"></span>
                  <span class="text-xs font-bold font-mono text-gray-900"
                    >promo_insumos_campana</span
                  >
                </div>
                <span class="text-xs font-bold font-mono text-gray-900">₲ 4.900</span>
              </div>

              <div class="mt-4 flex flex-col gap-2 text-xs border-b border-gray-100 pb-4">
                <div class="flex justify-between">
                  <span class="text-gray-500">Destinatarios</span>
                  <span class="font-bold text-gray-900 font-mono">{{
                    destinatariosAlvo.length
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Tarifa por mensaje</span>
                  <span class="font-bold text-gray-900 font-mono">₲ 4.900</span>
                </div>
              </div>

              <div class="flex justify-between items-center py-3">
                <span class="text-xs font-bold text-gray-900">Costo estimado</span>
                <span class="text-base font-extrabold text-gray-900 font-mono">
                  {{ custoEstimadoFmt }}
                </span>
              </div>

              <button
                (click)="dispararCampanha()"
                [disabled]="disparando"
                class="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {{ disparando ? 'Enviando campaña...' : 'Programar envío' }}
              </button>

              <p class="text-[11px] text-gray-400 mt-3 leading-relaxed">
                Las respuestas de la campaña se distribuyen entre los vendedores según las reglas de
                distribución.
              </p>
            </div>

            <div class="bg-white rounded-xl border border-amber-300 p-5 shadow-sm">
              <p class="text-[10px] font-bold tracking-widest text-amber-700 uppercase">
                Tarifas de Meta
              </p>
              <p class="text-xs text-gray-600 mt-2 leading-relaxed">
                Las plantillas de marketing se cobran por mensaje entregado. Las de utilidad cuestan
                menos y las respuestas dentro de la ventana de 24 h no tienen costo (₲ 0).
              </p>
              <a
                routerLink="/admin/costos"
                class="inline-block mt-3 px-3.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Ver tarifas y plantillas
              </a>
            </div>
          </div>
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-gray-200/80 mt-6 shadow-sm overflow-x-auto">
          @if (historico.length === 0) {
            <div class="p-8 text-center text-xs text-gray-400">
              Todavía no se enviaron campañas en esta sesión.
            </div>
          } @else {
            <div class="min-w-[680px]">
              <div
                class="grid grid-cols-[1.6fr_1fr_1fr_0.7fr_0.9fr] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-5 py-3 border-b border-gray-100"
              >
                <span>Campaña</span>
                <span>Fecha</span>
                <span>Plantilla</span>
                <span>Destinatarios</span>
                <span class="text-right">Costo estimado</span>
              </div>

              @for (h of historico; track h.id) {
                <div
                  class="grid grid-cols-[1.6fr_1fr_1fr_0.7fr_0.9fr] gap-x-4 items-center px-5 py-3.5 border-b border-gray-50"
                >
                  <span class="text-xs font-bold text-gray-900">{{ h.nome }}</span>
                  <span class="text-xs text-gray-500">{{ h.data }}</span>
                  <span class="text-xs font-mono text-gray-700">{{ h.plantilla }}</span>
                  <span class="text-xs font-bold text-green-700">{{ h.entregues }} clientes</span>
                  <span class="text-xs font-bold text-gray-900 font-mono text-right">{{
                    h.custoTotal
                  }}</span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminMarketingComponent implements OnInit {
  private api = inject(AdminApiService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  aba: 'NUEVA' | 'HISTORIAL' = 'NUEVA';
  clientes: ClienteAdmin[] = [];

  nomeCampanha = '';
  formato: 'imagen' | 'video' | 'texto' = 'imagen';
  nomeArquivo = '';
  textoMensagem =
    'Hola {{cliente}}, ya está disponible la línea de insumos para la campaña. Respondé este mensaje y te paso precios.';
  variaveisDisponiveis = ['{{cliente}}', '{{vendedor}}'];
  publico: 'TODOS' | 'MAYORISTAS' | 'MINORISTAS' = 'TODOS';
  tarifaUnitaria = 4900;

  disparando = false;
  avisoSucesso = '';
  historico: CampanhaHistorico[] = [];

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.api.listarClientes().subscribe((lista) => {
      this.clientes = lista;
      this.cdr.detectChanges();
    });
  }

  get destinatariosAlvo(): ClienteAdmin[] {
    if (this.publico === 'MAYORISTAS') {
      return this.clientes.filter((c) => c.sector === 'Mayorista');
    }
    if (this.publico === 'MINORISTAS') {
      return this.clientes.filter((c) => c.sector !== 'Mayorista');
    }
    return this.clientes;
  }

  get custoEstimadoFmt(): string {
    const total = this.destinatariosAlvo.length * this.tarifaUnitaria;
    return '₲ ' + total.toLocaleString('es-PY');
  }

  inserirVariavel(v: string) {
    this.textoMensagem = (this.textoMensagem + ' ' + v).trim();
  }

  aoSelecionarArquivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.nomeArquivo = f.name;
  }

  dispararCampanha() {
    const nome = this.nomeCampanha.trim() || 'Campaña Insumos Agrícolas';
    const qtd = this.destinatariosAlvo.length;

    this.historico.unshift({
      id: Date.now(),
      nome,
      data: 'Hoy · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      plantilla: 'promo_insumos_campana',
      formato: this.formato,
      enviados: qtd,
      entregues: qtd,
      custoTotal: this.custoEstimadoFmt,
    });

    this.nomeCampanha = '';
    this.avisoSucesso = `Campaña "${nome}" registrada para ${qtd} cliente(s).`;
    setTimeout(() => {
      this.avisoSucesso = '';
      this.cdr.detectChanges();
    }, 5000);
  }
}
