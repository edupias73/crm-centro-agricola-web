import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { AdminApiService, ConversaSupervisao, UsuarioAdmin } from '../../admin-api.service';
import { AtendimentoService } from '../../../../atendimento.service';
import { ConfiguracaoService } from '../../../../configuracao.service';
import { WebsocketService } from '../../../../websocket.service';

@Component({
  selector: 'app-admin-conversaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Supervisión</p>
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Todas las conversaciones</h1>
          <p class="text-xs text-gray-500 mt-1">
            Vista completa de la operación en vivo desde MySQL · Actualización automática
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            [(ngModel)]="busca"
            placeholder="Buscar cliente, teléfono o vendedor..."
            class="bg-white border border-gray-200 rounded-lg px-3.5 py-2 text-xs w-64 focus:outline-none focus:border-green-700"
          />
          <div class="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
            <span class="text-gray-400 font-bold uppercase mr-2">Vendedor</span>
            <select
              [(ngModel)]="filtroVendedor"
              class="bg-transparent font-semibold text-gray-800 focus:outline-none"
            >
              <option value="TODOS">Todos</option>
              <option value="Sin asignar">Sin asignar (Fila)</option>
              @for (u of usuarios; track u.id) {
                <option [value]="u.nome">{{ u.nome }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-3 mt-5">
        <div class="flex gap-2 flex-wrap">
          <button
            (click)="filtroStatus = 'TODOS'"
            [ngClass]="
              filtroStatus === 'TODOS'
                ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                : 'border-gray-200 bg-white text-gray-600'
            "
            class="px-3.5 py-1.5 text-xs rounded-lg border transition-all"
          >
            Todos
          </button>
          <button
            (click)="filtroStatus = 'ABIERTAS'"
            [ngClass]="
              filtroStatus === 'ABIERTAS'
                ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                : 'border-gray-200 bg-white text-gray-600'
            "
            class="px-3.5 py-1.5 text-xs rounded-lg border transition-all"
          >
            Abiertas
          </button>
          <button
            (click)="filtroStatus = 'SLA'"
            [ngClass]="
              filtroStatus === 'SLA'
                ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                : 'border-gray-200 bg-white text-gray-600'
            "
            class="px-3.5 py-1.5 text-xs rounded-lg border transition-all"
          >
            Fuera de SLA
          </button>
          <button
            (click)="filtroStatus = 'CERRADAS'"
            [ngClass]="
              filtroStatus === 'CERRADAS'
                ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                : 'border-gray-200 bg-white text-gray-600'
            "
            class="px-3.5 py-1.5 text-xs rounded-lg border transition-all"
          >
            Cerradas
          </button>
        </div>
        <span class="text-xs text-gray-400">
          {{ conversasFiltradas.length }} de {{ conversas.length }} conversaciones
        </span>
      </div>

      <div class="bg-white rounded-xl border border-gray-200/80 mt-4 shadow-sm overflow-x-auto">
        @if (carregando) {
          <div class="p-8 text-center text-xs text-gray-400">Cargando conversaciones reales...</div>
        } @else if (conversasFiltradas.length === 0) {
          <div class="p-8 text-center text-xs text-gray-400">
            Ninguna conversación encontrada con estos filtros.
          </div>
        } @else {
          <div class="min-w-[760px]">
            <div
              class="grid grid-cols-[1.4fr_0.8fr_1.2fr_2fr_0.8fr_80px] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-5 py-3 border-b border-gray-100"
            >
              <span>Cliente</span>
              <span>Sector</span>
              <span>Vendedor</span>
              <span>Último mensaje</span>
              <span>Estado / SLA</span>
              <span class="text-right"></span>
            </div>

            @for (c of conversasFiltradas; track c.id) {
              <div
                class="grid grid-cols-[1.4fr_0.8fr_1.2fr_2fr_0.8fr_80px] gap-x-4 items-center px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/60"
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

                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="w-6 h-6 rounded-full bg-green-50 text-green-800 text-[10px] font-bold flex items-center justify-center shrink-0"
                  >
                    {{ c.vendedor === 'Sin asignar' ? '—' : iniciais(c.vendedor) }}
                  </span>
                  <span class="text-xs text-gray-700 truncate">{{ c.vendedor }}</span>
                </div>

                <div class="min-w-0">
                  <p class="text-xs text-gray-700 truncate">{{ c.msg }}</p>
                  <p class="text-[11px] text-gray-400">{{ c.hora }} · {{ c.cat }}</p>
                </div>

                <div>
                  @if (c.status === 'FECHADO') {
                    <span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-500">
                      cerrada
                    </span>
                  } @else if (c.status === 'RESPONDIDO') {
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-green-50 text-green-700">
                      ✓ respondido
                    </span>
                  } @else if (c.status === 'ATRASADO' || c.esperaMin >= limiteSla) {
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-red-50 text-red-600">
                      {{ c.esperaMin }} min
                    </span>
                  } @else if (c.esperaMin >= metadeSla) {
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700">
                      {{ c.esperaMin }} min
                    </span>
                  } @else {
                    <span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-600">
                      {{ c.esperaMin }} min
                    </span>
                  }
                </div>

                <div class="text-right">
                  <button
                    (click)="abrirNoChat(c)"
                    class="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    Abrir
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminConversacionesComponent implements OnInit, OnDestroy {
  private api = inject(AdminApiService);
  private atendimentoService = inject(AtendimentoService);
  private configService = inject(ConfiguracaoService);
  private wsService = inject(WebsocketService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  conversas: ConversaSupervisao[] = [];
  usuarios: UsuarioAdmin[] = [];
  carregando = true;

  filtroStatus: 'TODOS' | 'ABIERTAS' | 'SLA' | 'CERRADAS' = 'TODOS';
  filtroVendedor = 'TODOS';
  busca = '';
  limiteSla = 40;

  private subs = new Subscription();

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.subs.add(
      this.route.queryParams.subscribe((params) => {
        if (params['vendedor']) {
          this.filtroVendedor = params['vendedor'];
        }
      }),
    );

    this.subs.add(
      this.configService.regras$.subscribe((r) => {
        this.limiteSla = r.tempoLimiteMinutos;
        this.cdr.detectChanges();
      }),
    );

    this.carregar();

    this.subs.add(
      this.wsService.pulsoTempoReal$.subscribe(() => this.carregar()),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  carregar() {
    forkJoin({
      conversas: this.api.listarConversas(),
      usuarios: this.api.listarUsuarios(),
    }).subscribe({
      next: ({ conversas, usuarios }) => {
        this.conversas = conversas;
        this.usuarios = usuarios;
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.carregando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get metadeSla(): number {
    return Math.max(1, Math.floor(this.limiteSla / 2));
  }

  get conversasFiltradas(): ConversaSupervisao[] {
    return this.conversas.filter((c) => {
      if (this.filtroStatus === 'ABIERTAS' && c.status === 'FECHADO') return false;
      if (
        this.filtroStatus === 'SLA' &&
        (c.status === 'FECHADO' || c.status === 'RESPONDIDO' || (c.esperaMin < this.limiteSla && c.status !== 'ATRASADO'))
      ) {
        return false;
      }
      if (this.filtroStatus === 'CERRADAS' && c.status !== 'FECHADO') return false;
      if (this.filtroVendedor !== 'TODOS' && c.vendedor !== this.filtroVendedor) return false;

      const t = this.busca.trim().toLowerCase();
      if (!t) return true;
      return (
        c.nome.toLowerCase().includes(t) ||
        c.tel.toLowerCase().includes(t) ||
        c.vendedor.toLowerCase().includes(t) ||
        c.msg.toLowerCase().includes(t)
      );
    });
  }

  abrirNoChat(c: ConversaSupervisao) {
    this.atendimentoService.selecionar({
      id: c.id,
      nomeCliente: c.nome,
      telefoneCliente: c.tel,
      status: c.status,
      ultimaInteracao: new Date().toISOString(),
      setor: c.sector,
      categoria: c.cat,
    });
    this.router.navigate(['/chat']);
  }

  iniciais(nome: string): string {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
}