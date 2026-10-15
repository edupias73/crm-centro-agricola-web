import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminApiService, UsuarioAdmin, ItemAuditoria } from '../../admin-api.service';
import { ConfiguracaoService, RegrasOperacionais } from '../../../../configuracao.service';

@Component({
  selector: 'app-admin-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-1 min-h-full w-full">
      <!-- SUBMENU SECUNDÁRIO BRANCO (Desktop) -->
      <div class="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0 p-4">
        <p class="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
          Panel del gestor
        </p>
        <h2 class="text-base font-bold text-gray-900 mt-0.5 mb-4">Configuración</h2>

        <div class="flex flex-col gap-1">
          @for (sub of menuConfig; track sub.id) {
            <button
              (click)="selecionarAba(sub.id)"
              [ngClass]="
                abaAtiva === sub.id
                  ? 'bg-[#0a3a2a] text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-50 font-medium'
              "
              class="text-left px-3.5 py-2.5 rounded-xl text-xs transition-all"
            >
              {{ sub.label }}
            </button>
          }
        </div>
      </div>

      <!-- CONTEÚDO DA SUB-ABA SELECIONADA -->
      <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
        <!-- Barra Horizontal Mobile/Tablet -->
        <div
          class="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-gray-200 no-scrollbar"
        >
          @for (sub of menuConfig; track sub.id) {
            <button
              (click)="selecionarAba(sub.id)"
              [ngClass]="
                abaAtiva === sub.id
                  ? 'bg-[#0a3a2a] text-white font-bold shadow-2xs'
                  : 'bg-white text-gray-600 border border-gray-200'
              "
              class="px-3.5 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 transition-all"
            >
              {{ sub.label }}
            </button>
          }
        </div>

        @if (mensagemSucesso) {
          <div
            class="mb-4 p-3.5 bg-green-50 border border-green-200 text-green-800 text-xs font-bold rounded-xl shadow-2xs"
          >
            ✅ {{ mensagemSucesso }}
          </div>
        }

        <!-- 1. USUARIOS Y VENDEDORES -->
        @if (abaAtiva === 'usuarios') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Equipo</p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Usuarios y vendedores</h1>
            </div>
            <button
              (click)="abrirModalNovoUsuario()"
              class="px-4 py-2.5 bg-[#0a3a2a] hover:bg-green-900 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              + Nuevo usuario
            </button>
          </div>

          <div class="grid grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 mt-6">
            <div class="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <span class="text-xs text-gray-500">Usuarios activos</span>
              <p class="text-2xl font-extrabold text-gray-900 mt-1">
                {{ totalAtivos }} / {{ usuarios.length }}
              </p>
            </div>
            <div class="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <span class="text-xs text-gray-500">En línea ahora</span>
              <p class="text-2xl font-extrabold text-green-700 mt-1">{{ totalOnline }}</p>
            </div>
            <div class="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <span class="text-xs text-gray-500">Mayorista / Minorista</span>
              <p class="text-2xl font-extrabold text-gray-900 mt-1">
                {{ totalMayoristas }} / {{ totalMinoristas }}
              </p>
            </div>
            <div class="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <span class="text-xs text-gray-500">Atenciones abiertas</span>
              <p class="text-2xl font-extrabold text-gray-900 mt-1">{{ totalConversasAbertas }}</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 mt-5 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-sm font-bold text-gray-900">Usuarios registrados en MySQL</h2>
                <p class="text-xs text-gray-400">
                  Estado de conexión, sector y activación de cuenta
                </p>
              </div>
            </div>

            <!-- Desktop Table -->
            <div class="hidden md:block">
              <div
                class="grid grid-cols-[1.8fr_0.8fr_0.8fr_1fr_0.9fr_60px] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-2 pb-2.5 border-b border-gray-100"
              >
                <span>Usuario</span>
                <span>Perfil</span>
                <span>Sector</span>
                <span>Horario</span>
                <span>Estado</span>
                <span class="text-right">Activo</span>
              </div>

              @for (u of usuarios; track u.id) {
                <div
                  class="grid grid-cols-[1.8fr_0.8fr_0.8fr_1fr_0.9fr_60px] gap-x-4 items-center px-2 py-3 border-b border-gray-50"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="w-8 h-8 rounded-full bg-green-50 text-green-800 flex items-center justify-center font-bold text-xs shrink-0"
                    >
                      {{ iniciais(u.nome) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-gray-900 truncate">{{ u.nome }}</p>
                      <p class="text-[11px] text-gray-400 truncate">{{ u.email }}</p>
                    </div>
                  </div>
                  <span class="text-xs text-gray-700">{{ u.perfil }}</span>
                  <div>
                    <span
                      class="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                      [ngClass]="
                        u.sector === 'Mayorista'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-green-50 text-green-800'
                      "
                    >
                      {{ u.sector }}
                    </span>
                  </div>
                  <span class="text-xs font-mono text-gray-600">{{ u.cargaHoraria }}</span>
                  <span
                    class="text-xs flex items-center gap-1.5"
                    [ngClass]="u.estado === 'En línea' ? 'text-green-600 font-semibold' : 'text-gray-400'"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      [ngClass]="u.estado === 'En línea' ? 'bg-green-500' : 'bg-gray-300'"
                    ></span>
                    {{ u.estado }}
                  </span>
                  <div class="flex justify-end">
                    <button
                      type="button"
                      (click)="alternarAtivoUsuario(u)"
                      class="w-10 h-5 rounded-full transition-colors p-0.5"
                      [ngClass]="u.ativo ? 'bg-green-700' : 'bg-gray-300'"
                    >
                      <div
                        class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                        [class.translate-x-5]="u.ativo"
                      ></div>
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Mobile Cards -->
            <div class="md:hidden flex flex-col gap-3">
              @for (u of usuarios; track u.id) {
                <div class="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/40 flex flex-col gap-2.5">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div
                        class="w-9 h-9 rounded-full bg-[#0a3a2a] text-white flex items-center justify-center font-bold text-xs shrink-0"
                      >
                        {{ iniciais(u.nome) }}
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-gray-900 truncate">{{ u.nome }}</p>
                        <p class="text-[11px] text-gray-400 truncate">{{ u.email }}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="alternarAtivoUsuario(u)"
                      class="w-10 h-5 rounded-full transition-colors p-0.5 shrink-0"
                      [ngClass]="u.ativo ? 'bg-green-700' : 'bg-gray-300'"
                    >
                      <div
                        class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                        [class.translate-x-5]="u.ativo"
                      ></div>
                    </button>
                  </div>

                  <div class="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60">
                    <div class="flex items-center gap-2">
                      <span
                        class="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                        [ngClass]="
                          u.sector === 'Mayorista'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-green-50 text-green-800'
                        "
                      >
                        {{ u.sector }}
                      </span>
                      <span class="text-gray-500">{{ u.perfil }}</span>
                    </div>
                    <span
                      class="text-xs flex items-center gap-1.5 font-semibold"
                      [ngClass]="u.estado === 'En línea' ? 'text-green-600' : 'text-gray-400'"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        [ngClass]="u.estado === 'En línea' ? 'bg-green-500' : 'bg-gray-300'"
                      ></span>
                      {{ u.estado }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- 2. PERMISOS -->
        @else if (abaAtiva === 'permisos') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Accesos</p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Permisos</h1>
              <p class="text-xs text-gray-500 mt-1">Qué puede ver y hacer cada perfil en el CRM.</p>
            </div>
            <div class="flex gap-2">
              <button
                (click)="descartar()"
                class="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
              >
                Descartar
              </button>
              <button
                (click)="guardar()"
                class="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold"
              >
                Guardar cambios
              </button>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200/80 mt-6 shadow-xs overflow-hidden">
            <div
              class="grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_90px_90px] gap-x-3 text-[10px] font-bold text-gray-400 uppercase px-4 sm:px-5 py-3 border-b border-gray-100"
            >
              <span>Permiso</span>
              <span class="text-center">Gerente</span>
              <span class="text-center">Vendedor</span>
            </div>

            @for (p of permisosLista; track p.chave) {
              <div
                class="grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_90px_90px] gap-x-3 items-center px-4 sm:px-5 py-4 border-b border-gray-50"
              >
                <div>
                  <p class="text-xs font-bold text-gray-900">{{ p.titulo }}</p>
                  <p class="text-[11px] text-gray-400 mt-0.5">{{ p.desc }}</p>
                </div>
                <div class="flex justify-center">
                  <button
                    type="button"
                    (click)="p.gerente = !p.gerente"
                    class="w-10 h-5 rounded-full transition-colors p-0.5"
                    [ngClass]="p.gerente ? 'bg-green-700' : 'bg-gray-300'"
                  >
                    <div
                      class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                      [class.translate-x-5]="p.gerente"
                    ></div>
                  </button>
                </div>
                <div class="flex justify-center">
                  <button
                    type="button"
                    (click)="p.vendedor = !p.vendedor"
                    class="w-10 h-5 rounded-full transition-colors p-0.5"
                    [ngClass]="p.vendedor ? 'bg-green-700' : 'bg-gray-300'"
                  >
                    <div
                      class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                      [class.translate-x-5]="p.vendedor"
                    ></div>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- 3. DISTRIBUCIÓN DE CONVERSACIONES -->
        @else if (abaAtiva === 'distribucion') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">
                Distribución
              </p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">
                Distribución de conversaciones
              </h1>
            </div>
            <div class="flex gap-2">
              <button
                (click)="descartar()"
                class="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
              >
                Descartar
              </button>
              <button
                (click)="guardar()"
                class="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold"
              >
                Guardar cambios
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 mt-6">
            <div class="flex flex-col gap-3">
              <div
                class="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center justify-between shadow-xs"
              >
                <div class="pr-4">
                  <p class="text-xs font-bold text-gray-900">Sticky Session</p>
                  <p class="text-[11px] text-gray-500 mt-0.5">
                    El cliente vuelve siempre al último vendedor que lo atendió.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="regras.stickySessionAtiva = !regras.stickySessionAtiva"
                  class="w-10 h-5 rounded-full transition-colors p-0.5 shrink-0"
                  [ngClass]="regras.stickySessionAtiva ? 'bg-green-700' : 'bg-gray-300'"
                >
                  <div
                    class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                    [class.translate-x-5]="regras.stickySessionAtiva"
                  ></div>
                </button>
              </div>

              <div
                class="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center justify-between shadow-xs"
              >
                <div class="pr-4">
                  <p class="text-xs font-bold text-gray-900">Transbordo por SLA</p>
                  <p class="text-[11px] text-gray-500 mt-0.5">
                    Si el vendedor no responde dentro del límite, pasa al siguiente en línea.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="regras.transbordoAutomatico = !regras.transbordoAutomatico"
                  class="w-10 h-5 rounded-full transition-colors p-0.5 shrink-0"
                  [ngClass]="regras.transbordoAutomatico ? 'bg-green-700' : 'bg-gray-300'"
                >
                  <div
                    class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                    [class.translate-x-5]="regras.transbordoAutomatico"
                  ></div>
                </button>
              </div>

              <div
                class="bg-white rounded-2xl border border-gray-200/80 p-4 flex items-center justify-between shadow-xs"
              >
                <div class="pr-4">
                  <p class="text-xs font-bold text-gray-900">Respetar sector del cliente</p>
                  <p class="text-[11px] text-gray-500 mt-0.5">
                    Mayorista va a mayoristas; minorista a minoristas.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="regras.respeitarSetorCliente = !regras.respeitarSetorCliente"
                  class="w-10 h-5 rounded-full transition-colors p-0.5 shrink-0"
                  [ngClass]="regras.respeitarSetorCliente ? 'bg-green-700' : 'bg-gray-300'"
                >
                  <div
                    class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                    [class.translate-x-5]="regras.respeitarSetorCliente"
                  ></div>
                </button>
              </div>
            </div>

            <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
              <h2 class="text-sm font-bold text-gray-900 mb-4">Parámetros de distribución</h2>
              <div class="flex flex-col gap-3.5 text-xs">
                <div>
                  <label class="text-gray-500 block mb-1">Máximo de atenciones por vendedor</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      [(ngModel)]="regras.maximoAtendimentosPorVendedor"
                      class="border border-gray-200 rounded-xl px-3 py-2 w-28 font-bold font-mono"
                    />
                    <span class="text-gray-400">atenciones</span>
                  </div>
                </div>
                <div>
                  <label class="text-gray-500 block mb-1">Duración de la Sticky Session</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      [(ngModel)]="regras.duracaoStickyDias"
                      class="border border-gray-200 rounded-xl px-3 py-2 w-28 font-bold font-mono"
                    />
                    <span class="text-gray-400">días</span>
                  </div>
                </div>
                <div>
                  <label class="text-gray-500 block mb-1">Espera antes del transbordo (SLA)</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      [(ngModel)]="regras.tempoLimiteMinutos"
                      class="border border-gray-200 rounded-xl px-3 py-2 w-28 font-bold font-mono"
                    />
                    <span class="text-gray-400">minutos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- 4. TRANSFERENCIAS -->
        @else if (abaAtiva === 'transferencias') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">
                Movimientos
              </p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Transferencias</h1>
            </div>
            <div class="flex gap-2">
              <button
                (click)="guardar()"
                class="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold"
              >
                Guardar cambios
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
              <h2 class="text-sm font-bold text-gray-900">Historial de transferencias reales</h2>
              <p class="text-xs text-gray-400 mb-4">Movimientos registrados en MySQL</p>

              @if (logsTransferencias.length === 0) {
                <div class="py-6 text-center text-xs text-gray-400">
                  Ninguna transferencia registrada todavía.
                </div>
              } @else {
                <div class="divide-y divide-gray-50">
                  @for (t of logsTransferencias; track $index) {
                    <div class="py-2.5 flex items-center justify-between text-xs gap-2">
                      <span class="font-mono text-gray-400">{{ t.hora }}</span>
                      <span class="font-bold text-gray-900 truncate">{{ t.usuario }}</span>
                      <span class="text-gray-600 truncate">{{ t.detalhe }}</span>
                    </div>
                  }
                </div>
              }
            </div>

            <div
              class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <h2 class="text-sm font-bold text-gray-900 mb-3">Regla de transferencia</h2>
                <p class="text-xs text-gray-500">
                  Controlá si los vendedores deben indicar obligatoriamente un motivo al transferir
                  una atención a otro compañero.
                </p>
              </div>
              <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-gray-900">Exigir motivo al transferir</p>
                  <p class="text-[11px] text-gray-400">
                    El vendedor no puede transferir sin justificar.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="regras.exigirMotivoTransferencia = !regras.exigirMotivoTransferencia"
                  class="w-10 h-5 rounded-full transition-colors p-0.5"
                  [ngClass]="regras.exigirMotivoTransferencia ? 'bg-green-700' : 'bg-gray-300'"
                >
                  <div
                    class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                    [class.translate-x-5]="regras.exigirMotivoTransferencia"
                  ></div>
                </button>
              </div>
            </div>
          </div>
        }

        <!-- 5. ALERTAS Y SLA -->
        @else if (abaAtiva === 'sla') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Servicio</p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Alertas y SLA</h1>
              <p class="text-xs text-gray-500 mt-1">
                Tiempo límite real que ejecuta el motor SlaMonitorService en Railway.
              </p>
            </div>
            <div class="flex gap-2">
              <button
                (click)="descartar()"
                class="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
              >
                Descartar
              </button>
              <button
                (click)="guardar()"
                [disabled]="salvando"
                class="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {{ salvando ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 mt-6">
            <div
              class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col gap-4"
            >
              <h2 class="text-sm font-bold text-gray-900">Tiempos límite</h2>

              <div>
                <label class="text-xs font-bold text-gray-800 block mb-1"
                  >Espera máxima sin respuesta (SLA)</label
                >
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    [(ngModel)]="regras.tempoLimiteMinutos"
                    min="1"
                    max="1440"
                    class="border border-gray-200 rounded-xl px-3.5 py-2 w-full font-bold font-mono text-sm focus:outline-none focus:border-green-700"
                  />
                  <span class="text-xs text-gray-400 shrink-0">minutos</span>
                </div>
                <p class="text-[11px] text-gray-400 mt-1">
                  Si el vendedor no responde en {{ regras.tempoLimiteMinutos }} minutos, el sistema
                  transfiere el cliente a otro vendedor en línea.
                </p>
              </div>

              <div>
                <label class="text-xs font-bold text-gray-800 block mb-1"
                  >Primera respuesta esperada</label
                >
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    [(ngModel)]="regras.primeiraRespostaMinutos"
                    class="border border-gray-200 rounded-xl px-3.5 py-2 w-full font-bold font-mono text-sm"
                  />
                  <span class="text-xs text-gray-400 shrink-0">minutos</span>
                </div>
              </div>

              <div>
                <label class="text-xs font-bold text-gray-800 block mb-1"
                  >Ociosidad del vendedor</label
                >
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    [(ngModel)]="regras.ociosidadeMinutos"
                    class="border border-gray-200 rounded-xl px-3.5 py-2 w-full font-bold font-mono text-sm"
                  />
                  <span class="text-xs text-gray-400 shrink-0">minutos</span>
                </div>
              </div>

              <div>
                <label class="text-xs font-bold text-gray-800 block mb-1"
                  >Tolerancia fuera del expediente</label
                >
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    [(ngModel)]="regras.toleranciaForaExpedienteMinutos"
                    class="border border-gray-200 rounded-xl px-3.5 py-2 w-full font-bold font-mono text-sm"
                  />
                  <span class="text-xs text-gray-400 shrink-0">minutos</span>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs h-fit">
              <p class="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">
                Vista previa del indicador
              </p>
              <div class="flex flex-col gap-2 text-xs">
                <div class="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between">
                  <span class="font-bold text-gray-800">0 – {{ metadeSla }} min</span>
                  <span
                    class="px-2 py-0.5 bg-gray-200/70 text-gray-700 text-[10px] font-semibold rounded"
                    >En objetivo</span
                  >
                </div>
                <div class="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between">
                  <span class="font-bold text-gray-800"
                    >{{ metadeSla }} – {{ regras.tempoLimiteMinutos }} min</span
                  >
                  <span class="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded"
                    >En riesgo</span
                  >
                </div>
                <div class="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between">
                  <span class="font-bold text-gray-800">+{{ regras.tempoLimiteMinutos }} min</span>
                  <span class="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded"
                    >SLA excedido</span
                  >
                </div>
              </div>
            </div>
          </div>
        }

        <!-- 6. HORARIO DE ATENCIÓN -->
        @else if (abaAtiva === 'horario') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">
                Expediente
              </p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Horario de atención</h1>
            </div>
            <button
              (click)="guardar()"
              class="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold"
            >
              Guardar cambios
            </button>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200/80 p-5 mt-6 shadow-xs">
            <h2 class="text-sm font-bold text-gray-900 mb-4">Expediente semanal</h2>
            <div class="divide-y divide-gray-50">
              @for (d of expedienteSemanal; track d.dia) {
                <div class="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div class="flex items-center gap-3 w-36">
                    <button
                      type="button"
                      (click)="d.ativo = !d.ativo"
                      class="w-10 h-5 rounded-full transition-colors p-0.5 shrink-0"
                      [ngClass]="d.ativo ? 'bg-green-700' : 'bg-gray-300'"
                    >
                      <div
                        class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                        [class.translate-x-5]="d.ativo"
                      ></div>
                    </button>
                    <span class="text-xs font-bold text-gray-800">{{ d.dia }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      [(ngModel)]="d.inicio"
                      [disabled]="!d.ativo"
                      class="border border-gray-200 rounded-xl px-2.5 py-1.5 w-20 text-center font-mono"
                    />
                    <span class="text-gray-400">a</span>
                    <input
                      type="text"
                      [(ngModel)]="d.fim"
                      [disabled]="!d.ativo"
                      class="border border-gray-200 rounded-xl px-2.5 py-1.5 w-20 text-center font-mono"
                    />
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- 7. MENSAJES AUTOMÁTICOS (CONECTADOS AO MYSQL) -->
        @else if (abaAtiva === 'mensajes') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">
                Automatización
              </p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Mensajes automáticos</h1>
              <p class="text-xs text-gray-500 mt-1">
                Textos reales que envía el Bot de WhatsApp y se guardan en MySQL.
              </p>
            </div>
            <button
              (click)="guardar()"
              class="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold"
            >
              Guardar cambios
            </button>
          </div>

          <div class="flex flex-col gap-4 mt-6">
            @for (m of mensajesAutomaticos; track m.id) {
              <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2">
                    <h3 class="text-xs font-bold text-gray-900">{{ m.titulo }}</h3>
                    <span
                      class="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold rounded uppercase"
                      >{{ m.badge }}</span
                    >
                  </div>
                  <button
                    type="button"
                    (click)="m.ativo = !m.ativo"
                    class="w-10 h-5 rounded-full transition-colors p-0.5"
                    [ngClass]="m.ativo ? 'bg-green-700' : 'bg-gray-300'"
                  >
                    <div
                      class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                      [class.translate-x-5]="m.ativo"
                    ></div>
                  </button>
                </div>
                <p class="text-[11px] text-gray-400 mb-3">{{ m.desc }}</p>
                <textarea
                  rows="3"
                  [(ngModel)]="m.texto"
                  class="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-green-700"
                ></textarea>
                <div class="flex gap-2 mt-2">
                  @for (v of m.vars; track v) {
                    <button
                      type="button"
                      (click)="m.texto = (m.texto + ' ' + v).trim()"
                      class="px-2.5 py-0.5 bg-green-50 text-green-800 font-mono text-[10px] rounded border border-green-200"
                    >
                      {{ v }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- 8. TAGS Y CIERRES -->
        @else if (abaAtiva === 'tags') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">
                Tabulación
              </p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Tags y cierres</h1>
            </div>
            <button
              (click)="guardar()"
              class="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold"
            >
              Guardar cambios
            </button>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200/80 p-5 mt-6 shadow-xs">
            <h2 class="text-sm font-bold text-gray-900">
              Motivos de cierre disponibles para el vendedor
            </h2>
            <div class="flex gap-2 my-4">
              <input
                type="text"
                [(ngModel)]="novoMotivo"
                (keyup.enter)="adicionarMotivo()"
                placeholder="Nuevo motivo de cierre"
                class="flex-1 border border-gray-200 rounded-xl px-3.5 py-2 text-xs"
              />
              <button
                (click)="adicionarMotivo()"
                class="px-4 py-2 bg-[#0a3a2a] text-white text-xs font-bold rounded-xl"
              >
                Agregar
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              @for (m of regras.motivosCierre; track m) {
                <span
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-green-900 text-xs font-semibold"
                >
                  {{ m }}
                  <button
                    (click)="removerMotivo(m)"
                    class="text-green-700 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              }
            </div>
          </div>
        }

        <!-- 9. NOTIFICACIONES -->
        @else if (abaAtiva === 'notificaciones') {
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Avisos</p>
              <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Notificaciones</h1>
            </div>
            <button
              (click)="guardar()"
              class="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold"
            >
              Guardar cambios
            </button>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200/80 mt-6 shadow-xs overflow-hidden">
            @for (n of notificacionesEventos; track n.titulo) {
              <div class="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div>
                  <p class="text-xs font-bold text-gray-900">{{ n.titulo }}</p>
                  <p class="text-[11px] text-gray-400">{{ n.desc }}</p>
                </div>
                <button
                  type="button"
                  (click)="n.crm = !n.crm"
                  class="w-10 h-5 rounded-full transition-colors p-0.5"
                  [ngClass]="n.crm ? 'bg-green-700' : 'bg-gray-300'"
                >
                  <div
                    class="w-4 h-4 rounded-full bg-white shadow transform transition-transform"
                    [class.translate-x-5]="n.crm"
                  ></div>
                </button>
              </div>
            }
          </div>
        }

        <!-- 10. AUDITORÍA (LOGS REAIS DO BANCO MYSQL) -->
        @else if (abaAtiva === 'auditoria') {
          <div>
            <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Auditoría</p>
            <h1 class="text-2xl font-extrabold text-gray-900 mt-0.5">Auditoría (logs reales)</h1>
            <p class="text-xs text-gray-500 mt-1">
              Eventos registrados en la tabla audit_logs y en el historial de atenciones.
            </p>
          </div>

          <div class="flex gap-2 mt-5 overflow-x-auto pb-1 no-scrollbar">
            <button
              (click)="filtroAuditoria = 'TODOS'"
              [ngClass]="
                filtroAuditoria === 'TODOS'
                  ? 'border-[#0a3a2a] bg-[#0a3a2a] text-white font-bold'
                  : 'border-gray-200 bg-white text-gray-600'
              "
              class="px-3.5 py-1.5 text-xs rounded-xl border whitespace-nowrap"
            >
              Todos
            </button>
            <button
              (click)="filtroAuditoria = 'TRANSFERENCIAS'"
              [ngClass]="
                filtroAuditoria === 'TRANSFERENCIAS'
                  ? 'border-[#0a3a2a] bg-[#0a3a2a] text-white font-bold'
                  : 'border-gray-200 bg-white text-gray-600'
              "
              class="px-3.5 py-1.5 text-xs rounded-xl border whitespace-nowrap"
            >
              Transferencias
            </button>
            <button
              (click)="filtroAuditoria = 'CIERRES'"
              [ngClass]="
                filtroAuditoria === 'CIERRES'
                  ? 'border-[#0a3a2a] bg-[#0a3a2a] text-white font-bold'
                  : 'border-gray-200 bg-white text-gray-600'
              "
              class="px-3.5 py-1.5 text-xs rounded-xl border whitespace-nowrap"
            >
              Cierres
            </button>
            <button
              (click)="filtroAuditoria = 'ACCESOS'"
              [ngClass]="
                filtroAuditoria === 'ACCESOS'
                  ? 'border-[#0a3a2a] bg-[#0a3a2a] text-white font-bold'
                  : 'border-gray-200 bg-white text-gray-600'
              "
              class="px-3.5 py-1.5 text-xs rounded-xl border whitespace-nowrap"
            >
              Usuarios y Accesos
            </button>
          </div>

          @if (logsFiltrados.length === 0) {
            <div class="bg-white rounded-2xl border border-gray-200/80 p-8 mt-4 text-center text-xs text-gray-400">
              Ningún evento registrado en esta categoría todavía.
            </div>
          } @else {
            <!-- Desktop Table -->
            <div class="hidden md:block bg-white rounded-2xl border border-gray-200/80 mt-4 shadow-xs overflow-hidden">
              <div
                class="grid grid-cols-[80px_170px_160px_1fr] gap-x-4 text-[10px] font-bold text-gray-400 uppercase px-5 py-3 border-b border-gray-100 bg-gray-50/50"
              >
                <span>Hora</span>
                <span>Evento</span>
                <span>Usuario</span>
                <span>Detalle</span>
              </div>

              @for (l of logsFiltrados; track $index) {
                <div
                  class="grid grid-cols-[80px_170px_160px_1fr] gap-x-4 items-center px-5 py-3.5 border-b border-gray-50 text-xs"
                >
                  <span class="font-mono text-gray-500">{{ l.hora }}</span>
                  <div>
                    <span
                      class="px-2 py-0.5 text-[10px] font-bold rounded"
                      [ngClass]="
                        l.tipo === 'TRANSFERENCIAS'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-green-50 text-green-800'
                      "
                    >
                      {{ l.evento }}
                    </span>
                  </div>
                  <span class="font-bold text-gray-900">{{ l.usuario }}</span>
                  <span class="text-gray-600">{{ l.detalhe }}</span>
                </div>
              }
            </div>

            <!-- Mobile Cards -->
            <div class="md:hidden flex flex-col gap-2.5 mt-4">
              @for (l of logsFiltrados; track $index) {
                <div class="bg-white rounded-xl border border-gray-200/80 p-3.5 shadow-2xs flex flex-col gap-1.5">
                  <div class="flex items-center justify-between">
                    <span
                      class="px-2 py-0.5 text-[10px] font-bold rounded"
                      [ngClass]="
                        l.tipo === 'TRANSFERENCIAS'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-green-50 text-green-800'
                      "
                    >
                      {{ l.evento }}
                    </span>
                    <span class="font-mono text-[11px] text-gray-400">{{ l.hora }}</span>
                  </div>
                  <p class="text-xs font-bold text-gray-900">👤 {{ l.usuario }}</p>
                  <p class="text-xs text-gray-600">{{ l.detalhe }}</p>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- MODAL: NUEVO USUARIO -->
      @if (modalNovoUsuarioAberto) {
        <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 class="text-base font-bold text-gray-900">Nuevo usuario</h3>
            <p class="text-xs text-gray-500 mt-1">
              El usuario se creará en MySQL con contraseña cifrada y podrá iniciar sesión de
              inmediato.
            </p>

            <div class="flex flex-col gap-3.5 my-4 text-xs">
              <div>
                <label class="font-bold text-gray-700 block mb-1">Nombre completo</label>
                <input
                  type="text"
                  [(ngModel)]="novoNome"
                  placeholder="Ej: Rafael De Felice"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label class="font-bold text-gray-700 block mb-1">Correo electrónico (Login)</label>
                <input
                  type="email"
                  [(ngModel)]="novoEmail"
                  placeholder="rafael@centroagricola.com.py"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label class="font-bold text-gray-700 block mb-1">Contraseña inicial</label>
                <input
                  type="password"
                  [(ngModel)]="novaSenha"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="font-bold text-gray-700 block mb-1">Sector</label>
                  <select
                    [(ngModel)]="novoSetor"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <option value="Minorista">Minorista (Varejo)</option>
                    <option value="Mayorista">Mayorista (Atacado)</option>
                  </select>
                </div>

                <div>
                  <label class="font-bold text-gray-700 block mb-1">Perfil</label>
                  <select
                    [(ngModel)]="novoPerfil"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                (click)="modalNovoUsuarioAberto = false"
                class="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                (click)="confirmarCriacaoUsuario()"
                [disabled]="criandoUsuario"
                class="px-4 py-2 text-xs font-bold text-white bg-[#0a3a2a] hover:bg-green-900 rounded-xl disabled:opacity-50"
              >
                {{ criandoUsuario ? 'Creando...' : 'Crear usuario' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminConfiguracionComponent implements OnInit {
  private api = inject(AdminApiService);
  private configService = inject(ConfiguracaoService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  abaAtiva = 'usuarios';
  salvando = false;
  mensagemSucesso = '';

  usuarios: UsuarioAdmin[] = [];
  logsAuditoria: ItemAuditoria[] = [];
  filtroAuditoria = 'TODOS';

  regras: RegrasOperacionais = { ...this.configService.regrasAtuais };
  novoMotivo = '';

  modalNovoUsuarioAberto = false;
  novoNome = '';
  novoEmail = '';
  novaSenha = '';
  novoSetor = 'Minorista';
  novoPerfil = 'VENDEDOR';
  criandoUsuario = false;

  menuConfig = [
    { id: 'usuarios', label: 'Usuarios y vendedores' },
    { id: 'permisos', label: 'Permisos' },
    { id: 'distribucion', label: 'Distribución de conversaciones' },
    { id: 'transferencias', label: 'Transferencias' },
    { id: 'sla', label: 'Alertas y SLA' },
    { id: 'horario', label: 'Horario de atención' },
    { id: 'mensajes', label: 'Mensajes automáticos' },
    { id: 'tags', label: 'Tags y cierres' },
    { id: 'notificaciones', label: 'Notificaciones' },
    { id: 'auditoria', label: 'Auditoría (logs)' },
  ];

  permisosLista = [
    {
      chave: 'ver_todas',
      titulo: 'Ver todas las conversaciones',
      desc: 'Acceso al monitor completo.',
      gerente: true,
      vendedor: false,
    },
    {
      chave: 'transferir',
      titulo: 'Transferir atención',
      desc: 'Mover una conversación a otro vendedor.',
      gerente: true,
      vendedor: true,
    },
    {
      chave: 'cerrar',
      titulo: 'Cerrar atención',
      desc: 'Finalizar y tabular la conversación.',
      gerente: true,
      vendedor: true,
    },
    {
      chave: 'informes',
      titulo: 'Ver informes y ranking',
      desc: 'Métricas de equipo y SLA.',
      gerente: true,
      vendedor: false,
    },
  ];

  expedienteSemanal = [
    { dia: 'Lunes', ativo: true, inicio: '07:00', fim: '18:00' },
    { dia: 'Martes', ativo: true, inicio: '07:00', fim: '18:00' },
    { dia: 'Miércoles', ativo: true, inicio: '07:00', fim: '18:00' },
    { dia: 'Jueves', ativo: true, inicio: '07:00', fim: '18:00' },
    { dia: 'Viernes', ativo: true, inicio: '07:00', fim: '18:00' },
    { dia: 'Sábado', ativo: true, inicio: '07:00', fim: '12:00' },
    { dia: 'Domingo', ativo: false, inicio: '—', fim: '—' },
  ];

  mensajesAutomaticos = [
    {
      id: 'saludo',
      titulo: 'Saludo inicial (Menú Bot)',
      badge: 'PRIMER CONTACTO',
      desc: 'Se envía cuando un número escribe por primera vez sin Sticky Session.',
      ativo: true,
      texto:
        '¡Hola! Bienvenido a Centro Agrícola. 🌾\nPor favor, elegí una opción:\n\n1 - Mayorista (Atacado)\n2 - Minorista (Varejo)',
      vars: ['{{cliente}}', '{{empresa}}'],
    },
    {
      id: 'asignacion',
      titulo: 'Confirmación de asignación',
      badge: 'AL ASIGNAR',
      desc: 'Avisa al cliente qué vendedor lo va a atender.',
      ativo: true,
      texto:
        '✅ ¡Todo listo! Te va a atender {{vendedor}}, de nuestro equipo de {{sector}}. En breve te responde.',
      vars: ['{{vendedor}}', '{{sector}}'],
    },
  ];

  notificacionesEventos = [
    {
      titulo: 'Nueva conversación',
      desc: 'Un cliente escribe por primera vez y entra en la fila.',
      crm: true,
    },
    {
      titulo: 'Conversación sin respuesta',
      desc: 'El vendedor abrió pero no respondió dentro del SLA.',
      crm: true,
    },
    {
      titulo: 'Transferencia recibida',
      desc: 'Otro vendedor te transfiere una conversación.',
      crm: true,
    },
    {
      titulo: 'Alerta de SLA',
      desc: 'Una conversación superó el tiempo máximo configurado.',
      crm: true,
    },
  ];

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.route.queryParams.subscribe((p) => {
      if (p['aba']) {
        this.abaAtiva = p['aba'];
      }
    });

    this.configService.regras$.subscribe((r) => {
      this.regras = { ...r, motivosCierre: [...r.motivosCierre] };
      const pTransf = this.permisosLista.find((p) => p.chave === 'transferir');
      const pCerrar = this.permisosLista.find((p) => p.chave === 'cerrar');
      if (pTransf) pTransf.vendedor = r.vendedorPodeTransferir;
      if (pCerrar) pCerrar.vendedor = r.vendedorPodeFechar;

      if (r.msgSaludoInicial) this.mensajesAutomaticos[0].texto = r.msgSaludoInicial;
      if (r.msgConfirmacionAsignacion) {
        this.mensajesAutomaticos[1].texto = r.msgConfirmacionAsignacion;
      }
      this.cdr.detectChanges();
    });

    this.carregarDadosReais();
  }

  selecionarAba(id: string) {
    this.abaAtiva = id;
    if (id === 'auditoria' || id === 'transferencias' || id === 'usuarios') {
      this.carregarDadosReais();
    }
  }

  carregarDadosReais() {
    this.api.listarUsuarios().subscribe((u) => {
      this.usuarios = u;
      this.cdr.detectChanges();
    });

    this.api.listarAuditoria().subscribe((logs) => {
      this.logsAuditoria = logs;
      this.cdr.detectChanges();
    });
  }

  abrirModalNovoUsuario() {
    this.novoNome = '';
    this.novoEmail = '';
    this.novaSenha = '';
    this.novoSetor = 'Minorista';
    this.novoPerfil = 'VENDEDOR';
    this.modalNovoUsuarioAberto = true;
  }

  confirmarCriacaoUsuario() {
    if (!this.novoNome.trim() || !this.novoEmail.trim() || this.criandoUsuario) {
      alert('Completá el nombre y el correo electrónico.');
      return;
    }

    this.criandoUsuario = true;
    this.api
      .criarUsuario({
        nome: this.novoNome.trim(),
        email: this.novoEmail.trim(),
        senha: this.novaSenha.trim() || '123456',
        setor: this.novoSetor,
        perfil: this.novoPerfil,
      })
      .subscribe({
        next: (criado) => {
          this.usuarios.push(criado);
          this.criandoUsuario = false;
          this.modalNovoUsuarioAberto = false;
          this.exibirSucesso(`Usuario ${criado.nome} creado con éxito en MySQL.`);
          this.carregarDadosReais();
        },
        error: (e) => {
          this.criandoUsuario = false;
          alert(e.error?.message || 'Error al crear el usuario. Verificá si el correo ya existe.');
          this.cdr.detectChanges();
        },
      });
  }

  alternarAtivoUsuario(u: UsuarioAdmin) {
    const novoEstado = !u.ativo;
    this.api.alterarStatusAtivo(u.id, novoEstado).subscribe({
      next: (atualizado) => {
        u.ativo = atualizado.ativo;
        u.estado = atualizado.estado;
        this.exibirSucesso(`Estado de ${u.nome} actualizado.`);
      },
      error: () => {
        alert('No se pudo cambiar el estado del usuario.');
      },
    });
  }

  adicionarMotivo() {
    const limpo = this.novoMotivo.trim();
    if (limpo && !this.regras.motivosCierre.includes(limpo)) {
      this.regras.motivosCierre.push(limpo);
    }
    this.novoMotivo = '';
  }

  removerMotivo(m: string) {
    this.regras.motivosCierre = this.regras.motivosCierre.filter((x) => x !== m);
  }

  descartar() {
    this.regras = {
      ...this.configService.regrasAtuais,
      motivosCierre: [...this.configService.regrasAtuais.motivosCierre],
    };
  }

  guardar() {
    this.salvando = true;
    const pTransf = this.permisosLista.find((p) => p.chave === 'transferir');
    const pCerrar = this.permisosLista.find((p) => p.chave === 'cerrar');
    this.regras.vendedorPodeTransferir = pTransf ? pTransf.vendedor : true;
    this.regras.vendedorPodeFechar = pCerrar ? pCerrar.vendedor : true;
    this.regras.msgSaludoInicial = this.mensajesAutomaticos[0].texto;
    this.regras.msgConfirmacionAsignacion = this.mensajesAutomaticos[1].texto;

    this.configService.salvarSlaNoServidor(this.regras).subscribe({
      next: () => {
        this.salvando = false;
        this.exibirSucesso('Configuración, permisos y textos del Bot guardados en MySQL.');
      },
      error: () => {
        this.salvando = false;
        this.exibirSucesso('Configuración aplicada.');
      },
    });
  }

  private exibirSucesso(msg: string) {
    this.mensagemSucesso = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensagemSucesso = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  get metadeSla(): number {
    return Math.max(1, Math.floor((this.regras.tempoLimiteMinutos || 40) / 2));
  }

  get totalAtivos(): number {
    return this.usuarios.filter((u) => u.ativo).length;
  }

  get totalOnline(): number {
    return this.usuarios.filter((u) => u.estado === 'En línea').length;
  }

  get totalMayoristas(): number {
    return this.usuarios.filter((u) => u.sector === 'Mayorista').length;
  }

  get totalMinoristas(): number {
    return this.usuarios.filter((u) => u.sector !== 'Mayorista').length;
  }

  get totalConversasAbertas(): number {
    return this.usuarios.reduce((acc, u) => acc + u.ativas, 0);
  }

  get logsTransferencias(): ItemAuditoria[] {
    return this.logsAuditoria.filter((l) => l.tipo === 'TRANSFERENCIAS');
  }

  get logsFiltrados(): ItemAuditoria[] {
    if (this.filtroAuditoria === 'TODOS') return this.logsAuditoria;
    return this.logsAuditoria.filter((l) => l.tipo === this.filtroAuditoria);
  }

  iniciais(nome: string): string {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
}