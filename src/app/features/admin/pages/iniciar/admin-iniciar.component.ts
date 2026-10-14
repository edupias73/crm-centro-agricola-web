import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApiService, UsuarioAdmin } from '../../admin-api.service';
import { AtendimentoService } from '../../../../atendimento.service';

@Component({
  selector: 'app-admin-iniciar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
      <p class="text-[11px] font-bold tracking-widest text-green-700 uppercase">Nuevo contacto</p>
      <h1 class="text-2xl font-bold text-gray-900 mt-1">Iniciar conversación</h1>
      <p class="text-xs text-gray-500 mt-1">
        Para escribir primero a un cliente, WhatsApp exige una plantilla aprobada por Meta. La
        conversación se guarda en MySQL y se asigna al vendedor elegido.
      </p>

      @if (mensagemSucesso) {
        <div
          class="mt-4 p-3.5 bg-green-50 border border-green-200 text-green-800 text-xs font-bold rounded-xl flex items-center justify-between"
        >
          <span>✅ {{ mensagemSucesso }}</span>
          <button (click)="irParaChatCriado()" class="px-3 py-1 bg-green-700 text-white rounded-lg">
            Ver en el chat →
          </button>
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <!-- 1. Cliente + 2. Plantilla -->
        <div class="flex flex-col gap-6">
          <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
            <h2 class="text-sm font-bold text-gray-900 mb-4">1 · Cliente</h2>
            <div class="flex flex-col gap-4">
              <div>
                <label class="text-xs text-gray-500 font-medium">Número de WhatsApp</label>
                <input
                  type="text"
                  [(ngModel)]="telefone"
                  placeholder="+595 983 412 770"
                  class="w-full mt-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-green-700"
                />
              </div>
              <div>
                <label class="text-xs text-gray-500 font-medium">Nombre del cliente</label>
                <input
                  type="text"
                  [(ngModel)]="nomeCliente"
                  placeholder="Ej: Ramón Duarte"
                  class="w-full mt-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-green-700"
                />
              </div>
              <div>
                <label class="text-xs text-gray-500 font-medium block mb-1.5">Sector</label>
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="sector = 'Mayorista'"
                    [ngClass]="
                      sector === 'Mayorista'
                        ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                        : 'border-gray-200 bg-white text-gray-600'
                    "
                    class="px-4 py-2 rounded-lg border text-xs"
                  >
                    Mayorista
                  </button>
                  <button
                    type="button"
                    (click)="sector = 'Minorista'"
                    [ngClass]="
                      sector === 'Minorista'
                        ? 'border-green-700 bg-green-50 text-green-800 font-bold'
                        : 'border-gray-200 bg-white text-gray-600'
                    "
                    class="px-4 py-2 rounded-lg border text-xs"
                  >
                    Minorista
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
            <h2 class="text-sm font-bold text-gray-900 mb-4">2 · Plantilla de apertura</h2>
            <div class="flex flex-col gap-2.5">
              @for (p of plantillas; track p.id) {
                <label
                  (click)="plantillaId = p.id"
                  class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all"
                  [ngClass]="
                    plantillaId === p.id
                      ? 'border-green-700 bg-green-50/30 ring-1 ring-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  "
                >
                  <div class="flex items-center gap-3">
                    <input
                      type="radio"
                      name="pl"
                      [checked]="plantillaId === p.id"
                      class="text-green-700"
                    />
                    <div>
                      <p class="text-xs font-bold font-mono text-gray-900">{{ p.nome }}</p>
                      <p class="text-[11px] text-gray-400">{{ p.categoria }}</p>
                    </div>
                  </div>
                  <span class="text-xs font-bold text-gray-900">{{ p.custoFmt }}</span>
                </label>
              }
            </div>

            <div class="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
              <p class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Vista previa
              </p>
              <p class="text-xs text-gray-700 mt-1">{{ plantillaAtual.previa }}</p>
            </div>
          </div>
        </div>

        <!-- 3. Vendedor responsable (Lista Real do Banco) -->
        <div
          class="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h2 class="text-sm font-bold text-gray-900 mb-1">3 · Vendedor responsable</h2>
            <p class="text-xs text-gray-400 mb-4">
              Elegí qué vendedor real de tu equipo va a atender esta conversación.
            </p>

            <div class="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              @for (u of usuarios; track u.id; let i = $index) {
                <label
                  (click)="vendedorSelecionado = u"
                  class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
                  [ngClass]="
                    vendedorSelecionado?.id === u.id
                      ? 'border-green-700 bg-green-50/30 ring-1 ring-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  "
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                      [ngClass]="
                        vendedorSelecionado?.id === u.id
                          ? 'bg-[#0a3a2a] text-white'
                          : 'bg-gray-100 text-gray-700'
                      "
                    >
                      {{ iniciais(u.nome) }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-gray-900 truncate">{{ u.nome }}</span>
                        @if (i === 0) {
                          <span
                            class="px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded uppercase"
                          >
                            MENOR CARGA
                          </span>
                        }
                      </div>
                      <p class="text-[11px] text-gray-400">
                        {{ u.sector }} · {{ u.ativas }} activas
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span
                      class="px-2 py-0.5 text-[10px] font-semibold rounded"
                      [ngClass]="
                        u.estado === 'En línea'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      "
                    >
                      {{ u.estado }}
                    </span>
                    <input
                      type="radio"
                      name="vend"
                      [checked]="vendedorSelecionado?.id === u.id"
                      class="text-green-700"
                    />
                  </div>
                </label>
              }
            </div>
          </div>

          <div
            class="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap"
          >
            <div>
              <p class="text-[10px] text-gray-400">Se asigna a</p>
              <p class="text-xs font-bold text-gray-900">
                {{ vendedorSelecionado?.nome || 'Sin asignar' }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-[10px] text-gray-400">Costo estimado</p>
              <p class="text-sm font-bold text-gray-900 font-mono">{{ plantillaAtual.custoFmt }}</p>
            </div>
            <button
              (click)="disparar()"
              [disabled]="enviando"
              class="px-5 py-2.5 bg-[#0a3a2a] hover:bg-green-900 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {{ enviando ? 'Iniciando...' : 'Iniciar conversación' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminIniciarComponent implements OnInit {
  private api = inject(AdminApiService);
  private atendimentoService = inject(AtendimentoService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  telefone = '+595 9';
  nomeCliente = '';
  sector: 'Mayorista' | 'Minorista' = 'Minorista';
  plantillaId = 'codigo_acceso_crm';

  usuarios: UsuarioAdmin[] = [];
  vendedorSelecionado: UsuarioAdmin | null = null;
  enviando = false;
  mensagemSucesso = '';
  ultimoAtendimentoCriado: any = null;

  plantillas = [
    {
      id: 'promo_insumos_campana',
      nome: 'promo_insumos_campana',
      categoria: 'Marketing',
      custoFmt: '₲ 4.900',
      previa:
        'Hola {{1}}, ya está disponible la línea de insumos para la campaña. Respondé este mensaje y te paso precios.',
    },
    {
      id: 'recordatorio_pedido',
      nome: 'recordatorio_pedido',
      categoria: 'Utilidad',
      custoFmt: '₲ 2.100',
      previa: 'Hola {{1}}, tu pedido está listo para retirar en sucursal.',
    },
    {
      id: 'seguimiento_presupuesto',
      nome: 'seguimiento_presupuesto',
      categoria: 'Utilidad',
      custoFmt: '₲ 2.100',
      previa: 'Hola {{1}}, ¿pudiste revisar el presupuesto que te enviamos?',
    },
    {
      id: 'codigo_acceso_crm',
      nome: 'codigo_acceso_crm',
      categoria: 'Autenticación',
      custoFmt: '₲ 1.700',
      previa: 'Tu código de acceso es {{1}}. Vence en 10 minutos.',
    },
  ];

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.api.listarUsuarios().subscribe((lista) => {
      this.usuarios = [...lista].sort((a, b) => a.ativas - b.ativas);
      if (this.usuarios.length > 0) {
        this.vendedorSelecionado = this.usuarios[0];
      }
      this.cdr.detectChanges();
    });
  }

  get plantillaAtual() {
    return this.plantillas.find((p) => p.id === this.plantillaId) ?? this.plantillas[3];
  }

  disparar() {
    if (!this.telefone.trim() || !this.nomeCliente.trim() || this.enviando) {
      alert('Completá el número de WhatsApp y el nombre del cliente.');
      return;
    }

    this.enviando = true;
    const textoPrevia = this.plantillaAtual.previa.replace('{{1}}', this.nomeCliente.trim());

    this.api
      .iniciarConversa({
        telefone: this.telefone.trim(),
        nomeCliente: this.nomeCliente.trim(),
        sector: this.sector,
        plantillaNome: this.plantillaAtual.nome,
        textoPrevia,
        vendedorId: this.vendedorSelecionado?.id ?? null,
      })
      .subscribe({
        next: (criada) => {
          this.enviando = false;
          this.ultimoAtendimentoCriado = criada;
          this.mensagemSucesso = `Conversación creada para ${criada.nome} y asignada a ${criada.vendedor}.`;
          this.nomeCliente = '';
          this.telefone = '+595 9';
          this.cdr.detectChanges();
        },
        error: () => {
          this.enviando = false;
          alert('No se pudo iniciar la conversación.');
          this.cdr.detectChanges();
        },
      });
  }

  irParaChatCriado() {
    if (!this.ultimoAtendimentoCriado) return;
    this.atendimentoService.selecionar({
      id: this.ultimoAtendimentoCriado.id,
      nomeCliente: this.ultimoAtendimentoCriado.nome,
      telefoneCliente: this.ultimoAtendimentoCriado.tel,
      status: 'ABERTO',
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
