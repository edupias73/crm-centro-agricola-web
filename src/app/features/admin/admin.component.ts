import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { API_CONFIG } from '../../api.config';

interface ItemMenu {
  id: string;
  label: string;
  icon: string;
}

interface VendedorCarga {
  id: number;
  nome: string;
  setor: string;
  quantidadeAtendimentos: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  usuarioEmail = '';
  usuarioPerfil = '';
  secaoAtiva = 'dashboard';

  ranking: VendedorCarga[] = [];
  carregandoRanking = true;
  erroRanking = false;

  // Dados de exemplo (sem endpoint no back ainda)
  conversacionesEjemplo = [
    { ini: 'RD', nome: 'Ramón Duarte', tel: '+595 983 412 770', sector: 'Minorista', vendedor: 'Rafael De Felice', msg: 'Entrega en 48 horas hábiles, sin costo adicional...', cat: 'Insumos', espera: '4 min', atrasado: false },
    { ini: 'EB', nome: 'Estancia San Blas', tel: '+595 971 208 344', sector: 'Mayorista', vendedor: 'Everton Alexandre', msg: 'Perfecto. Podés emitir a nombre de la estancia?', cat: 'Implementos', espera: '12 min', atrasado: false },
    { ini: 'MC', nome: 'Miguel Cabañas', tel: '+595 985 664 129', sector: 'Minorista', vendedor: 'Rafael De Felice', msg: 'Alguien me puede responder por favor?', cat: 'Semillas', espera: '46 min', atrasado: true },
    { ini: 'YG', nome: 'Coop. Yguazú', tel: '+595 973 551 806', sector: 'Mayorista', vendedor: 'Everton Alexandre', msg: 'Buenas, queremos coordinar el mantenimiento...', cat: 'Cosechadoras', espera: '52 min', atrasado: true },
    { ini: 'BF', nome: 'Blanca Ferreira', tel: '+595 984 117 253', sector: 'Minorista', vendedor: 'Sin asignar', msg: 'Buenas, quería reservar insumos para retirar...', cat: 'Insumos', espera: '6 min', atrasado: false },
    { ini: 'SK', nome: 'Silos Katueté', tel: '+595 975 330 118', sector: 'Mayorista', vendedor: 'Daniel De Faveri', msg: 'Perfecto, te envío la confirmación por escrito...', cat: 'Cosechadoras', espera: '3 min', atrasado: false },
  ];

  clientesEjemplo = [
    { ini: 'RD', nome: 'Ramón Duarte', tel: '+595 983 412 770', ciudad: 'Minga Guazú', sector: 'Minorista', vendedor: 'Rafael De Felice', conv: 24, ultimo: 'Hoy 14:32' },
    { ini: 'EB', nome: 'Estancia San Blas', tel: '+595 971 208 344', ciudad: 'Santa Rita', sector: 'Mayorista', vendedor: 'Everton Alexandre', conv: 61, ultimo: 'Hoy 14:20' },
    { ini: 'MC', nome: 'Miguel Cabañas', tel: '+595 985 664 129', ciudad: 'Naranjal', sector: 'Minorista', vendedor: 'Rafael De Felice', conv: 9, ultimo: 'Hoy 14:06' },
    { ini: 'SK', nome: 'Silos Katueté', tel: '+595 975 330 118', ciudad: 'Katueté', sector: 'Mayorista', vendedor: 'Daniel De Faveri', conv: 48, ultimo: 'Hoy 14:28' },
    { ini: 'OB', nome: 'Osvaldo Benítez', tel: '+595 986 220 774', ciudad: 'Naranjal', sector: 'Minorista', vendedor: 'Rafael De Felice', conv: 6, ultimo: 'Hoy 14:11' },
    { ini: 'CE', nome: 'Chacra Doña Elsa', tel: '+595 983 771 402', ciudad: 'Santa Rita', sector: 'Minorista', vendedor: 'Wilson Oliveira', conv: 14, ultimo: 'Hoy 13:50' },
  ];

  gastoCategoria = [
    { nome: 'Marketing', valor: '₲ 9.016.000', msgs: '1840 mensajes', pct: 77, cor: 'bg-orange-500' },
    { nome: 'Utilidad', valor: '₲ 2.700.600', msgs: '1286 mensajes', pct: 23, cor: 'bg-green-600' },
    { nome: 'Autenticación', valor: '₲ 40.800', msgs: '24 mensajes', pct: 2, cor: 'bg-green-600' },
  ];

  gastoVendedor = [
    { ini: 'DF', nome: 'Daniel De Faveri', mkt: 412, util: 188, auth: 4, total: 604, gasto: '₲ 2.420.400' },
    { ini: 'EA', nome: 'Everton Alexandre', mkt: 366, util: 204, auth: 2, total: 572, gasto: '₲ 2.225.200' },
    { ini: 'RF', nome: 'Rafael De Felice', mkt: 198, util: 246, auth: 6, total: 450, gasto: '₲ 1.497.000' },
    { ini: 'WO', nome: 'Wilson Oliveira', mkt: 244, util: 97, auth: 1, total: 342, gasto: '₲ 1.401.000' },
    { ini: 'GM', nome: 'Gustavo Mendonza', mkt: 221, util: 132, auth: 1, total: 354, gasto: '₲ 1.361.800' },
  ];

  menu: ItemMenu[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 4h6v6H4V4zM14 4h6v6h-6V4zM4 14h6v6H4v-6zM14 14h6v6h-6v-6z' },
    { id: 'conversaciones', label: 'Todas las conversaciones', icon: 'M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 21l1.8-4A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { id: 'clientes', label: 'Clientes', icon: 'M12 4a4 4 0 100 8 4 4 0 000-8zM6 20a6 6 0 0112 0' },
    { id: 'costos', label: 'Costos de mensajes', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'configuracion', label: 'Configuración', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.lerToken();
    this.carregarRanking();
  }

  private lerToken() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const dados = JSON.parse(atob(base64));
      this.usuarioEmail = dados.sub || '';
      this.usuarioPerfil = dados.perfil || '';
    } catch (e) {
      console.error('Não foi possível ler o token', e);
    }
  }

  private carregarRanking() {
    const base = API_CONFIG.baseUrl;
    forkJoin({
      atacado: this.http.get<VendedorCarga[]>(`${base}/api/usuarios/disponiveis?setor=Atacado`),
      varejo: this.http.get<VendedorCarga[]>(`${base}/api/usuarios/disponiveis?setor=Varejo`),
    }).subscribe({
      next: ({ atacado, varejo }) => {
        this.ranking = [...atacado, ...varejo].sort(
          (a, b) => a.quantidadeAtendimentos - b.quantidadeAtendimentos,
        );
        this.carregandoRanking = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Erro ao carregar ranking', e);
        this.erroRanking = true;
        this.carregandoRanking = false;
        this.cdr.detectChanges();
      },
    });
  }

  get usuarioNome(): string {
    return this.usuarioEmail ? this.usuarioEmail.split('@')[0] : 'Usuário';
  }

  get totalVendedores(): number {
    return this.ranking.length;
  }

  get totalAtivos(): number {
    return this.ranking.reduce((soma, v) => soma + v.quantidadeAtendimentos, 0);
  }

  tituloSecao(): string {
    return this.menu.find((m) => m.id === this.secaoAtiva)?.label ?? '';
  }

  iniciais(texto: string): string {
    if (!texto) return '?';
    const partes = texto.trim().split(/\s+/);
    const p = partes[0]?.[0] ?? '';
    const u = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (p + u).toUpperCase() || texto.substring(0, 2).toUpperCase();
  }

  irParaVendedor() {
    this.router.navigate(['/chat']);
  }

  sair() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.router.navigate(['/login']);
  }
}