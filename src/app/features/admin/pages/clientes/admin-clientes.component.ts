import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApiService, ClienteAdmin } from '../../admin-api.service';
import { AtendimentoService } from '../../../../atendimento.service';

@Component({
  selector: 'app-admin-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Cartera comercial</p>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Clientes</h1>
          <p class="text-xs text-gray-500 mt-1">
            Base histórica real de todos los clientes registrados en MySQL.
          </p>
        </div>
        <input
          type="text"
          [(ngModel)]="busca"
          placeholder="Buscar cliente, teléfono, ciudad o vendedor..."
          class="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs w-full sm:w-80 shadow-2xs focus:outline-none focus:border-green-700"
        />
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-5 mt-6">
        <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs">
          <span class="text-xs font-semibold text-gray-500">Clientes registrados</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{{ clientes.length }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs">
          <span class="text-xs font-semibold text-gray-500">Mayoristas</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-2">{{ totalMayoristas }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs">
          <span class="text-xs font-semibold text-gray-500">Minoristas</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{{ totalMinoristas }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs">
          <span class="text-xs font-semibold text-gray-500">En conversación ahora</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-green-700 mt-2">{{ totalEmConversa }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 mt-5 overflow-x-auto pb-1 no-scrollbar">
        <button
          (click)="filtro = 'TODOS'"
          [ngClass]="
            filtro === 'TODOS'
              ? 'border-[#0a3a2a] bg-[#0a3a2a] text-white font-bold shadow-2xs'
              : 'border-gray-200 bg-white text-gray-600'
          "
          class="px-3.5 py-1.5 text-xs rounded-xl border whitespace-nowrap transition-all"
        >
          Todos
        </button>
        <button
          (click)="filtro = 'Mayorista'"
          [ngClass]="
            filtro === 'Mayorista'
              ? 'border-[#0a3a2a] bg-[#0a3a2a] text-white font-bold shadow-2xs'
              : 'border-gray-200 bg-white text-gray-600'
          "
          class="px-3.5 py-1.5 text-xs rounded-xl border whitespace-nowrap transition-all"
        >
          Mayorista
        </button>
        <button
          (click)="filtro = 'Minorista'"
          [ngClass]="
            filtro === 'Minorista'
              ? 'border-[#0a3a2a] bg-[#0a3a2a] text-white font-bold shadow-2xs'
              : 'border-gray-200 bg-white text-gray-600'
          "
          class="px-3.5 py-1.5 text-xs rounded-xl border whitespace-nowrap transition-all"
        >
          Minorista
        </button>
        <button
          (click)="filtro = 'ACTIVOS'"
          [ngClass]="
            filtro === 'ACTIVOS'
              ? 'border-[#0a3a2a] bg-[#0a3a2a] text-white font-bold shadow-2xs'
              : 'border-gray-200 bg-white text-gray-600'
          "
          class="px-3.5 py-1.5 text-xs rounded-xl border whitespace-nowrap transition-all"
        >
          En conversación
        </button>
      </div>

      @if (carregando) {
        <div class="bg-white rounded-2xl border border-gray-200/80 p-10 mt-4 text-center text-xs text-gray-400">
          Cargando cartera de clientes desde MySQL...
        </div>
      } @else if (clientesFiltrados.length === 0) {
        <div class="bg-white rounded-2xl border border-gray-200/80 p-10 mt-4 text-center text-xs text-gray-400">
          Ningún cliente encontrado.
        </div>
      } @else {
        <!-- VISTA DESKTOP (Tabela Completa) -->
        <div class="hidden md:block bg-white rounded-2xl border border-gray-200/80 mt-4 shadow-xs overflow-hidden">
          <div
            class="grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr_0.5fr_0.8fr_1fr_95px] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-5 py-3.5 border-b border-gray-100 bg-gray-50/50"
          >
            <span>Cliente</span>
            <span>Ciudad</span>
            <span>Sector</span>
            <span>Vendedor Titular</span>
            <span>Conv.</span>
            <span>Último</span>
            <span>Estado</span>
            <span class="text-right">Acción</span>
          </div>

          @for (c of clientesFiltrados; track c.id) {
            <div
              class="grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr_0.5fr_0.8fr_1fr_95px] gap-x-4 items-center px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/70 transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-9 h-9 rounded-full bg-green-50 text-green-800 border border-green-200/60 flex items-center justify-center font-bold text-xs shrink-0"
                >
                  {{ iniciais(c.nome) }}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-gray-900 truncate">{{ c.nome }}</p>
                  <p class="text-[11px] text-gray-400">{{ c.tel }}</p>
                </div>
              </div>
              <span class="text-xs text-gray-600 truncate">{{ c.ciudad }}</span>
              <div>
                <span
                  class="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase"
                  [ngClass]="
                    c.sector === 'Mayorista'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                      : 'bg-green-50 text-green-800 border border-green-200/60'
                  "
                >
                  {{ c.sector }}
                </span>
              </div>
              <span class="text-xs font-medium text-gray-700 truncate">{{ c.vendedor }}</span>
              <span class="text-xs font-extrabold text-gray-900">{{ c.conv }}</span>
              <span class="text-xs text-gray-400">{{ c.ultimo }}</span>
              <div>
                <span
                  class="px-2.5 py-1 text-[10px] font-bold rounded-full"
                  [ngClass]="
                    c.emConversa ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  "
                >
                  {{ c.emConversa ? '● En conversación' : 'Sin actividad' }}
                </span>
              </div>
              <div class="text-right">
                @if (c.ultimoAtendimentoId) {
                  <button
                    (click)="verChat(c)"
                    class="px-3 py-1.5 text-xs font-bold text-[#0a3a2a] bg-green-50/70 hover:bg-green-100 border border-green-200/70 rounded-xl transition-colors"
                  >
                    Ver chat
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- VISTA MOBILE (Cartões Responsivos) -->
        <div class="md:hidden flex flex-col gap-3 mt-4">
          @for (c of clientesFiltrados; track c.id) {
            <div class="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="w-10 h-10 rounded-full bg-[#0a3a2a] text-white flex items-center justify-center font-bold text-xs shrink-0"
                  >
                    {{ iniciais(c.nome) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-gray-900 truncate">{{ c.nome }}</p>
                    <p class="text-xs text-gray-400">{{ c.tel }} · {{ c.ciudad }}</p>
                  </div>
                </div>
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0"
                  [ngClass]="
                    c.sector === 'Mayorista'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-green-50 text-green-800'
                  "
                >
                  {{ c.sector }}
                </span>
              </div>

              <div class="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>👤 {{ c.vendedor }}</span>
                <span>{{ c.conv }} conv. · {{ c.ultimo }}</span>
              </div>

              <div class="flex items-center justify-between pt-1">
                <span
                  class="px-2.5 py-1 text-[10px] font-bold rounded-full"
                  [ngClass]="
                    c.emConversa ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  "
                >
                  {{ c.emConversa ? '● En conversación' : 'Sin actividad' }}
                </span>

                @if (c.ultimoAtendimentoId) {
                  <button
                    (click)="verChat(c)"
                    class="px-4 py-1.5 bg-[#0a3a2a] text-white text-xs font-bold rounded-xl"
                  >
                    Ver chat →
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminClientesComponent implements OnInit {
  private api = inject(AdminApiService);
  private atendimentoService = inject(AtendimentoService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  clientes: ClienteAdmin[] = [];
  carregando = true;
  filtro: 'TODOS' | 'Mayorista' | 'Minorista' | 'ACTIVOS' = 'TODOS';
  busca = '';

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.api.listarClientes().subscribe({
      next: (lista) => {
        this.clientes = lista;
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get totalMayoristas(): number {
    return this.clientes.filter((c) => c.sector === 'Mayorista').length;
  }

  get totalMinoristas(): number {
    return this.clientes.filter((c) => c.sector !== 'Mayorista').length;
  }

  get totalEmConversa(): number {
    return this.clientes.filter((c) => c.emConversa).length;
  }

  get clientesFiltrados(): ClienteAdmin[] {
    return this.clientes.filter((c) => {
      if (this.filtro === 'Mayorista' && c.sector !== 'Mayorista') return false;
      if (this.filtro === 'Minorista' && c.sector !== 'Minorista') return false;
      if (this.filtro === 'ACTIVOS' && !c.emConversa) return false;

      const t = this.busca.trim().toLowerCase();
      if (!t) return true;
      return (
        c.nome.toLowerCase().includes(t) ||
        c.tel.toLowerCase().includes(t) ||
        c.ciudad.toLowerCase().includes(t) ||
        c.vendedor.toLowerCase().includes(t)
      );
    });
  }

  verChat(c: ClienteAdmin) {
    if (!c.ultimoAtendimentoId) return;
    this.atendimentoService.selecionar({
      id: c.ultimoAtendimentoId,
      nomeCliente: c.nome,
      telefoneCliente: c.tel,
      status: c.emConversa ? 'ABERTO' : 'FECHADO',
      ultimaInteracao: new Date().toISOString(),
    });
    this.router.navigate(['/chat']);
  }

  iniciais(nome: string): string {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
}