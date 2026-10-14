import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AdminApiService, UsuarioAdmin, ConversaSupervisao } from '../../admin-api.service';

@Component({
  selector: 'app-admin-costos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">
        Control de gastos
      </p>
      <div class="flex items-start justify-between flex-wrap gap-4 mt-1">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Costos de mensajes</h1>
          <p class="text-xs text-gray-500 mt-1">
            Control de plantillas de WhatsApp y conversaciones gratuitas dentro de la ventana de 24
            h.
          </p>
        </div>

        <div class="flex bg-white border border-gray-200 rounded-lg p-1 text-xs">
          <button
            (click)="periodo = 'MES'"
            [ngClass]="periodo === 'MES' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'"
            class="px-3 py-1 rounded-md"
          >
            Este mes
          </button>
          <button
            (click)="periodo = 'ANTERIOR'"
            [ngClass]="
              periodo === 'ANTERIOR' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'
            "
            class="px-3 py-1 rounded-md"
          >
            Mes anterior
          </button>
          <button
            (click)="periodo = 'ANO'"
            [ngClass]="periodo === 'ANO' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'"
            class="px-3 py-1 rounded-md"
          >
            Año
          </button>
        </div>
      </div>

      <!-- 4 KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Gasto estimado en plantillas</span>
          <p class="text-2xl font-bold text-gray-900 mt-2">{{ gastoTotalFmt }}</p>
          <p class="text-xs text-gray-400 mt-1">Este mes</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Conversaciones gratuitas (24h)</span>
          <p class="text-2xl font-bold text-green-700 mt-2">{{ conversas.length }}</p>
          <p class="text-xs text-green-700 font-medium mt-1">Costo ₲ 0 (iniciadas por cliente)</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Tarifa media por plantilla</span>
          <p class="text-2xl font-bold text-gray-900 mt-2">₲ 2.100</p>
          <p class="text-xs text-gray-400 mt-1">utilidad / reactivación</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Presupuesto mensual</span>
          <p class="text-2xl font-bold text-gray-900 mt-2">₲ 16.000.000</p>
          <p class="text-xs text-gray-400 mt-1">límite configurado</p>
        </div>
      </div>

      <!-- Gasto por categoría -->
      <div class="bg-white rounded-xl border border-gray-200/80 p-5 mt-5 shadow-sm">
        <h2 class="text-sm font-bold text-gray-900 mb-4">
          Tarifas de referencia de Meta (Paraguay)
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-gray-800">Marketing (promo_insumos)</span>
              <span class="font-bold text-gray-900 font-mono">₲ 4.900 / msj</span>
            </div>
            <div class="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div class="h-full rounded-full bg-orange-600 w-3/4"></div>
            </div>
            <p class="text-[11px] text-gray-400 mt-1">Campañas masivas y promociones</p>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-gray-800">Utilidad (seguimiento / pedido)</span>
              <span class="font-bold text-gray-900 font-mono">₲ 2.100 / msj</span>
            </div>
            <div class="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div class="h-full rounded-full bg-green-700 w-2/5"></div>
            </div>
            <p class="text-[11px] text-gray-400 mt-1">Reapertura fuera de ventana de 24 h</p>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-gray-800">Servicio (Ventana 24 h)</span>
              <span class="font-bold text-green-700 font-mono">₲ 0 (Gratis)</span>
            </div>
            <div class="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div class="h-full rounded-full bg-green-500 w-full"></div>
            </div>
            <p class="text-[11px] text-gray-400 mt-1">
              Ilimitado cuando el cliente escribe primero
            </p>
          </div>
        </div>
      </div>

      <!-- Gasto por vendedor real -->
      <div class="bg-white rounded-xl border border-gray-200/80 p-5 mt-5 shadow-sm overflow-x-auto">
        <h2 class="text-sm font-bold text-gray-900">Actividad y costo por vendedor</h2>
        <p class="text-xs text-gray-400 mb-4">Vendedores reales registrados en el sistema</p>

        <div class="min-w-[680px]">
          <div
            class="grid grid-cols-[40px_1.6fr_0.8fr_0.8fr_0.8fr_1fr] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-2 pb-2.5 border-b border-gray-100"
          >
            <span>#</span>
            <span>Vendedor</span>
            <span>Sector</span>
            <span>Atenciones (24h Gratis)</span>
            <span>Plantillas Pagas</span>
            <span class="text-right">Costo Plantillas</span>
          </div>

          @for (u of usuarios; track u.id; let i = $index) {
            <div
              class="grid grid-cols-[40px_1.6fr_0.8fr_0.8fr_0.8fr_1fr] gap-x-4 items-center px-2 py-3 border-b border-gray-50"
            >
              <span class="text-xs text-gray-400">{{ i + 1 }}</span>
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0"
                >
                  {{ iniciais(u.nome) }}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-gray-900 truncate">{{ u.nome }}</p>
                  <p class="text-[10px] text-gray-400">{{ u.email }}</p>
                </div>
              </div>
              <span class="text-xs text-gray-600">{{ u.sector }}</span>
              <span class="text-xs font-mono font-bold text-green-700"
                >{{ contarConversasVendedor(u.nome) }} (₲ 0)</span
              >
              <span class="text-xs font-mono text-gray-700">{{
                contarPlantillasVendedor(u.nome)
              }}</span>
              <span class="text-xs font-mono font-bold text-gray-900 text-right">
                {{ custoVendedorFmt(u.nome) }}
              </span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminCostosComponent implements OnInit {
  private api = inject(AdminApiService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  periodo: 'MES' | 'ANTERIOR' | 'ANO' = 'MES';
  usuarios: UsuarioAdmin[] = [];
  conversas: ConversaSupervisao[] = [];

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    forkJoin({
      usuarios: this.api.listarUsuarios(),
      conversas: this.api.listarConversas(),
    }).subscribe(({ usuarios, conversas }) => {
      this.usuarios = usuarios;
      this.conversas = conversas;
      this.cdr.detectChanges();
    });
  }

  contarConversasVendedor(nome: string): number {
    return this.conversas.filter((c) => c.vendedor === nome).length;
  }

  contarPlantillasVendedor(nome: string): number {
    return this.conversas.filter((c) => c.vendedor === nome && c.msg.includes('[Plantilla:'))
      .length;
  }

  custoVendedorFmt(nome: string): string {
    const qtd = this.contarPlantillasVendedor(nome);
    return '₲ ' + (qtd * 2100).toLocaleString('es-PY');
  }

  get gastoTotalFmt(): string {
    const totalPlantillas = this.conversas.filter((c) => c.msg.includes('[Plantilla:')).length;
    return '₲ ' + (totalPlantillas * 2100).toLocaleString('es-PY');
  }

  iniciais(nome: string): string {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
}
