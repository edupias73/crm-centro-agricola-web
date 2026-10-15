import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import {
  AdminApiService,
  ResumoOperacao,
  UsuarioAdmin,
  ItemAuditoria,
} from '../../admin-api.service';
import { WebsocketService } from '../../../../websocket.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <!-- Cabeçalho -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest bg-green-100 text-green-800 uppercase">
            <span class="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
            Panel del gestor · En vivo
          </span>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-2">
            Resumen de la operación
          </h1>
          <p class="text-xs text-gray-500 mt-1">
            Métricas sincronizadas en tiempo real con MySQL y WebSocket activo
          </p>
        </div>

        <!-- Filtros Responsivos -->
        <div class="flex flex-wrap items-center gap-2.5">
          <div
            class="flex items-center bg-white border border-gray-200/90 shadow-2xs rounded-xl px-3.5 py-2 text-xs flex-1 sm:flex-initial"
          >
            <span class="text-gray-400 font-bold uppercase mr-2">Ver</span>
            <select
              [(ngModel)]="filtroEquipe"
              class="bg-transparent font-bold text-gray-800 focus:outline-none w-full"
            >
              <option value="TODOS">Todo el equipo</option>
              <option value="Mayorista">Sector Mayorista</option>
              <option value="Minorista">Sector Minorista</option>
            </select>
          </div>

          <div class="flex bg-white border border-gray-200/90 shadow-2xs rounded-xl p-1 text-xs w-full sm:w-auto">
            <button
              (click)="periodo = 'HOY'"
              [ngClass]="
                periodo === 'HOY' ? 'bg-[#0a3a2a] text-white font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              "
              class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all"
            >
              Hoy
            </button>
            <button
              (click)="periodo = 'SEMANA'"
              [ngClass]="
                periodo === 'SEMANA' ? 'bg-[#0a3a2a] text-white font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              "
              class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all"
            >
              Semana
            </button>
            <button
              (click)="periodo = 'MES'"
              [ngClass]="
                periodo === 'MES' ? 'bg-[#0a3a2a] text-white font-bold shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              "
              class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all"
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      <!-- 4 KPI Cards Reais com Acabamento Visual -->
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-5 mt-6">
        <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500">Conversaciones activas</span>
            <div class="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold text-sm">
              💬
            </div>
          </div>
          <p class="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-3">
            {{ resumo?.conversacionesActivas ?? 0 }}
          </p>
          <p class="text-[11px] text-green-700 font-semibold mt-1 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> en curso ahora
          </p>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500">Clientes registrados</span>
            <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
              👥
            </div>
          </div>
          <p class="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-3">
            {{ resumo?.clientesRegistrados ?? 0 }}
          </p>
          <p class="text-[11px] text-gray-500 mt-1 truncate">
            {{ resumo?.mayoristas ?? 0 }} mayoristas · {{ resumo?.minoristas ?? 0 }} minoristas
          </p>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500">En la fila</span>
            <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
              ⏳
            </div>
          </div>
          <p class="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-3">
            {{ resumo?.enLaFila ?? 0 }}
          </p>
          <p class="text-[11px] text-amber-700 font-medium mt-1">sin vendedor asignado</p>
        </div>

        <div class="bg-white rounded-2xl border border-red-100 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500">Fuera de SLA</span>
            <div class="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
              ⚡
            </div>
          </div>
          <p class="text-2xl sm:text-3xl font-extrabold text-red-600 mt-3">
            {{ resumo?.fueraDeSla ?? 0 }}
          </p>
          <p class="text-[11px] text-red-500 font-semibold mt-1">
            límite {{ resumo?.limiteSlaMinutos ?? 40 }} min
          </p>
        </div>
      </div>

      <!-- Banner de Último Transbordo Real -->
      @if (ultimoTransbordo) {
        <div
          class="bg-gradient-to-r from-amber-50/90 to-white border border-amber-300/80 rounded-2xl p-4 sm:p-5 mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        >
          <div class="flex items-start gap-3.5">
            <span
              class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 font-extrabold flex items-center justify-center shrink-0"
            >
              !
            </span>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-bold text-gray-900">{{ ultimoTransbordo.evento }}</p>
                <span
                  class="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md uppercase"
                >
                  Automático
                </span>
              </div>
              <p class="text-xs text-gray-600 mt-1 leading-relaxed">
                {{ ultimoTransbordo.detalhe }}
              </p>
              <p class="text-[11px] text-gray-400 mt-1">Hoy {{ ultimoTransbordo.hora }}</p>
            </div>
          </div>

          <a
            routerLink="/admin/configuracion"
            [queryParams]="{ aba: 'sla' }"
            class="shrink-0 text-center text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            Ver regla de SLA
          </a>
        </div>
      }

      <!-- Ranking Real del Equipo -->
      <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-6 mt-6 shadow-xs">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-bold text-gray-900">Ranking y carga del equipo</h2>
            <p class="text-xs text-gray-400">Estado de conexión y conversaciones activas en tiempo real</p>
          </div>
          <span class="text-xs text-green-700 font-bold flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> En vivo
          </span>
        </div>

        @if (carregando) {
          <div class="py-10 text-center text-xs text-gray-400">
            Cargando equipo desde el servidor...
          </div>
        } @else if (usuariosFiltrados.length === 0) {
          <div class="py-10 text-center text-xs text-gray-400">
            No hay usuarios en este sector. Podés crear vendedores en Configuración → Usuarios.
          </div>
        } @else {
          <!-- VISTA DESKTOP (Tabela Elegante) -->
          <div class="hidden md:block">
            <div
              class="grid grid-cols-[40px_2fr_0.9fr_1fr_1fr_120px] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-3 pb-3 border-b border-gray-100"
            >
              <span>#</span>
              <span>Vendedor</span>
              <span>Activas</span>
              <span>Horario</span>
              <span>Estado</span>
              <span class="text-right">Acción</span>
            </div>

            @for (u of usuariosFiltrados; track u.id; let i = $index) {
              <div
                class="grid grid-cols-[40px_2fr_0.9fr_1fr_1fr_120px] gap-x-4 items-center px-3 py-3.5 border-b border-gray-50 hover:bg-gray-50/70 transition-colors"
              >
                <span class="text-xs text-gray-400 font-bold">{{ i + 1 }}</span>
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="w-9 h-9 rounded-full bg-[#0a3a2a]/10 text-[#0a3a2a] flex items-center justify-center font-bold text-xs shrink-0"
                  >
                    {{ iniciais(u.nome) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-gray-900 truncate">{{ u.nome }}</p>
                    <p class="text-[11px] text-gray-400">{{ u.sector }} · {{ u.perfil }}</p>
                  </div>
                </div>
                <div>
                  <span class="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-900 text-xs font-extrabold">
                    {{ u.ativas }}
                  </span>
                </div>
                <span class="text-xs font-mono text-gray-500">{{ u.cargaHoraria }}</span>
                <div>
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    [ngClass]="
                      u.estado === 'En línea'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      [ngClass]="u.estado === 'En línea' ? 'bg-green-500' : 'bg-gray-400'"
                    ></span>
                    {{ u.estado }}
                  </span>
                </div>
                <div class="text-right">
                  <button
                    (click)="verConversasDoVendedor(u.nome)"
                    class="px-3 py-1.5 text-xs font-bold text-[#0a3a2a] bg-green-50/60 hover:bg-green-100/80 border border-green-200/70 rounded-xl transition-colors"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- VISTA MOBILE (Cartões Responsivos sem Scroll Horizontal) -->
          <div class="md:hidden flex flex-col gap-3">
            @for (u of usuariosFiltrados; track u.id; let i = $index) {
              <div class="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/40 flex flex-col gap-3">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="w-9 h-9 rounded-full bg-[#0a3a2a] text-white flex items-center justify-center font-bold text-xs shrink-0"
                    >
                      {{ iniciais(u.nome) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-gray-900 truncate">
                        #{{ i + 1 }} · {{ u.nome }}
                      </p>
                      <p class="text-[11px] text-gray-500">{{ u.sector }} · {{ u.perfil }}</p>
                    </div>
                  </div>
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                    [ngClass]="
                      u.estado === 'En línea'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-600'
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      [ngClass]="u.estado === 'En línea' ? 'bg-green-600' : 'bg-gray-400'"
                    ></span>
                    {{ u.estado }}
                  </span>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                  <div class="flex items-center gap-3">
                    <span class="text-gray-500">
                      Activas: <strong class="text-gray-900">{{ u.ativas }}</strong>
                    </span>
                    <span class="text-gray-400 font-mono text-[11px]">{{ u.cargaHoraria }}</span>
                  </div>
                  <button
                    (click)="verConversasDoVendedor(u.nome)"
                    class="px-3 py-1.5 text-xs font-bold text-white bg-[#0a3a2a] rounded-lg"
                  >
                    Ver chats →
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
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private api = inject(AdminApiService);
  private wsService = inject(WebsocketService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  resumo: ResumoOperacao | null = null;
  usuarios: UsuarioAdmin[] = [];
  ultimoTransbordo: ItemAuditoria | null = null;
  carregando = true;

  filtroEquipe = 'TODOS';
  periodo: 'HOY' | 'SEMANA' | 'MES' = 'HOY';

  private subs = new Subscription();

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.carregarDados();

    this.subs.add(
      this.wsService.pulsoTempoReal$.subscribe(() => {
        this.carregarDados();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  carregarDados() {
    forkJoin({
      resumo: this.api.obterResumo(),
      usuarios: this.api.listarUsuarios(),
      auditoria: this.api.listarAuditoria(),
    }).subscribe({
      next: ({ resumo, usuarios, auditoria }) => {
        this.resumo = resumo;
        this.usuarios = usuarios;
        this.ultimoTransbordo = auditoria.find((a) => a.tipo === 'TRANSFERENCIAS') || null;
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Erro ao carregar dashboard real', e);
        this.carregando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get usuariosFiltrados(): UsuarioAdmin[] {
    if (this.filtroEquipe === 'TODOS') return this.usuarios;
    return this.usuarios.filter((u) => u.sector === this.filtroEquipe);
  }

  verConversasDoVendedor(nome: string) {
    this.router.navigate(['/admin/conversaciones'], { queryParams: { vendedor: nome } });
  }

  iniciais(nome: string): string {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
}