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
      <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Cartera</p>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Clientes</h1>
          <p class="text-xs text-gray-500 mt-1">
            Base histórica real de todos los clientes que contactaron por WhatsApp.
          </p>
        </div>
        <input
          type="text"
          [(ngModel)]="busca"
          placeholder="Buscar cliente, teléfono, ciudad o vendedor..."
          class="bg-white border border-gray-200 rounded-lg px-3.5 py-2 text-xs w-full sm:w-72 focus:outline-none focus:border-green-700"
        />
      </div>

      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Clientes registrados</span>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ clientes.length }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Mayoristas</span>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ totalMayoristas }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">Minoristas</span>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ totalMinoristas }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <span class="text-xs text-gray-500">En conversación ahora</span>
          <p class="text-3xl font-bold text-green-700 mt-2">{{ totalEmConversa }}</p>
        </div>
      </div>

      <div class="flex gap-2 mt-5 flex-wrap">
        <button
          (click)="filtro = 'TODOS'"
          [ngClass]="
            filtro === 'TODOS'
              ? 'border-green-700 bg-green-50 text-green-800 font-bold'
              : 'border-gray-200 bg-white text-gray-600'
          "
          class="px-3.5 py-1.5 text-xs rounded-lg border"
        >
          Todos
        </button>
        <button
          (click)="filtro = 'Mayorista'"
          [ngClass]="
            filtro === 'Mayorista'
              ? 'border-green-700 bg-green-50 text-green-800 font-bold'
              : 'border-gray-200 bg-white text-gray-600'
          "
          class="px-3.5 py-1.5 text-xs rounded-lg border"
        >
          Mayorista
        </button>
        <button
          (click)="filtro = 'Minorista'"
          [ngClass]="
            filtro === 'Minorista'
              ? 'border-green-700 bg-green-50 text-green-800 font-bold'
              : 'border-gray-200 bg-white text-gray-600'
          "
          class="px-3.5 py-1.5 text-xs rounded-lg border"
        >
          Minorista
        </button>
        <button
          (click)="filtro = 'ACTIVOS'"
          [ngClass]="
            filtro === 'ACTIVOS'
              ? 'border-green-700 bg-green-50 text-green-800 font-bold'
              : 'border-gray-200 bg-white text-gray-600'
          "
          class="px-3.5 py-1.5 text-xs rounded-lg border"
        >
          En conversación
        </button>
      </div>

      <div class="bg-white rounded-xl border border-gray-200/80 mt-4 shadow-sm overflow-x-auto">
        @if (carregando) {
          <div class="p-8 text-center text-xs text-gray-400">
            Cargando cartera de clientes desde MySQL...
          </div>
        } @else if (clientesFiltrados.length === 0) {
          <div class="p-8 text-center text-xs text-gray-400">Ningún cliente encontrado.</div>
        } @else {
          <div class="min-w-[780px]">
            <div
              class="grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr_0.5fr_0.8fr_1fr_90px] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-5 py-3 border-b border-gray-100"
            >
              <span>Cliente</span>
              <span>Ciudad</span>
              <span>Sector</span>
              <span>Vendedor</span>
              <span>Conv.</span>
              <span>Último</span>
              <span>Estado</span>
              <span class="text-right"></span>
            </div>

            @for (c of clientesFiltrados; track c.id) {
              <div
                class="grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr_0.5fr_0.8fr_1fr_90px] gap-x-4 items-center px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/60"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0"
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
                    class="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                    [ngClass]="
                      c.sector === 'Mayorista'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-green-50 text-green-800'
                    "
                  >
                    {{ c.sector }}
                  </span>
                </div>
                <span class="text-xs text-gray-700 truncate">{{ c.vendedor }}</span>
                <span class="text-xs font-bold text-gray-900">{{ c.conv }}</span>
                <span class="text-xs text-gray-400">{{ c.ultimo }}</span>
                <div>
                  <span
                    class="px-2 py-0.5 text-[10px] font-semibold rounded"
                    [ngClass]="
                      c.emConversa ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-500'
                    "
                  >
                    {{ c.emConversa ? 'En conversación' : 'Sin actividad' }}
                  </span>
                </div>
                <div class="text-right">
                  @if (c.ultimoAtendimentoId) {
                    <button
                      (click)="verChat(c)"
                      class="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      Ver chat
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
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
