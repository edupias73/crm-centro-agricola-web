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
      <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Panel del gestor</p>
      <div class="flex items-start justify-between flex-wrap gap-4 mt-1">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Resumen de la operación</h1>
          <p class="text-xs text-gray-500 mt-1">
            Datos en tiempo real conectados a MySQL · WebSocket activo
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <div
            class="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
          >
            <span class="text-gray-400 font-bold uppercase mr-2">Ver</span>
            <select
              [(ngModel)]="filtroEquipe"
              class="bg-transparent font-semibold text-gray-800 focus:outline-none"
            >
              <option value="TODOS">Todo el equipo</option>
              <option value="Mayorista">Sector Mayorista</option>
              <option value="Minorista">Sector Minorista</option>
            </select>
          </div>

          <div class="flex bg-white border border-gray-200 rounded-lg p-1 text-xs">
            <button
              (click)="periodo = 'HOY'"
              [ngClass]="
                periodo === 'HOY' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'
              "
              class="px-3 py-1 rounded-md transition-colors"
            >
              Hoy
            </button>
            <button
              (click)="periodo = 'SEMANA'"
              [ngClass]="
                periodo === 'SEMANA' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'
              "
              class="px-3 py-1 rounded-md transition-colors"
            >
              Semana
            </button>
            <button
              (click)="periodo = 'MES'"
              [ngClass]="
                periodo === 'MES' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-500'
              "
              class="px-3 py-1 rounded-md transition-colors"
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      <!-- 4 KPI Cards Reais -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">Conversaciones activas</span>
            <span class="w-2 h-2 rounded-full bg-green-600"></span>
          </div>
          <p class="text-3xl font-bold text-gray-900 mt-2">
            {{ resumo?.conversacionesActivas ?? 0 }}
          </p>
          <p class="text-xs text-green-700 font-medium mt-1">en curso ahora</p>
        </div>

        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">Clientes registrados</span>
            <span class="w-2 h-2 rounded-full bg-green-600"></span>
          </div>
          <p class="text-3xl font-bold text-gray-900 mt-2">
            {{ resumo?.clientesRegistrados ?? 0 }}
          </p>
          <p class="text-xs text-gray-400 mt-1">
            {{ resumo?.mayoristas ?? 0 }} mayoristas · {{ resumo?.minoristas ?? 0 }} minoristas
          </p>
        </div>

        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">En la fila</span>
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ resumo?.enLaFila ?? 0 }}</p>
          <p class="text-xs text-gray-400 mt-1">sin vendedor asignado</p>
        </div>

        <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">Fuera de SLA</span>
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
          </div>
          <p class="text-3xl font-bold text-red-600 mt-2">{{ resumo?.fueraDeSla ?? 0 }}</p>
          <p class="text-xs text-red-500 font-medium mt-1">
            límite {{ resumo?.limiteSlaMinutos ?? 40 }} min
          </p>
        </div>
      </div>

      <!-- Banner de Último Transbordo Real (se existir no banco) -->
      @if (ultimoTransbordo) {
        <div
          class="bg-white border border-amber-300 rounded-xl p-5 mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div class="flex items-start gap-3.5">
            <span
              class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 font-bold flex items-center justify-center shrink-0"
            >
              !
            </span>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-bold text-gray-900">{{ ultimoTransbordo.evento }}</p>
                <span
                  class="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded uppercase"
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
            class="shrink-0 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3.5 py-2 hover:bg-gray-50 transition-colors"
          >
            Ver regla
          </a>
        </div>
      }

      <!-- Ranking Real del Equipo -->
      <div class="bg-white rounded-xl border border-gray-200/80 p-5 mt-5 shadow-sm overflow-x-auto">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-bold text-gray-900">Ranking del equipo</h2>
            <p class="text-xs text-gray-400">Usuarios reales registrados en la base de datos</p>
          </div>
          <span class="text-xs text-green-700 font-medium flex items-center gap-1.5">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span> En vivo
          </span>
        </div>

        @if (carregando) {
          <div class="py-8 text-center text-xs text-gray-400">
            Cargando equipo desde el servidor...
          </div>
        } @else if (usuariosFiltrados.length === 0) {
          <div class="py-8 text-center text-xs text-gray-400">
            No hay usuarios en este sector. Podés crear vendedores en Configuración → Usuarios.
          </div>
        } @else {
          <div class="min-w-[600px]">
            <div
              class="grid grid-cols-[40px_1.8fr_0.8fr_1fr_1fr_110px] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-3 pb-2.5 border-b border-gray-100"
            >
              <span>#</span>
              <span>Vendedor</span>
              <span>Activas</span>
              <span>Horario</span>
              <span>Estado</span>
              <span class="text-right"></span>
            </div>

            @for (u of usuariosFiltrados; track u.id; let i = $index) {
              <div
                class="grid grid-cols-[40px_1.8fr_0.8fr_1fr_1fr_110px] gap-x-4 items-center px-3 py-3 border-b border-gray-50 hover:bg-gray-50/60"
              >
                <span class="text-xs text-gray-400 font-medium">{{ i + 1 }}</span>
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0"
                  >
                    {{ iniciais(u.nome) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-gray-900 truncate">{{ u.nome }}</p>
                    <p class="text-[11px] text-gray-400">{{ u.sector }} · {{ u.perfil }}</p>
                  </div>
                </div>
                <span class="text-xs font-bold text-gray-900">{{ u.ativas }}</span>
                <span class="text-xs font-mono text-gray-600">{{ u.cargaHoraria }}</span>
                <span
                  class="text-xs flex items-center gap-1.5"
                  [ngClass]="u.estado === 'En línea' ? 'text-green-600' : 'text-gray-400'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    [ngClass]="u.estado === 'En línea' ? 'bg-green-500' : 'bg-gray-300'"
                  ></span>
                  {{ u.estado }}
                </span>
                <div class="text-right">
                  <button
                    (click)="verConversasDoVendedor(u.nome)"
                    class="px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    Ver detalle
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
      this.wsService.mensagens$.subscribe(() => {
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
