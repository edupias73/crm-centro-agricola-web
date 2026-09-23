import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../../../api.config';
import { AtendimentoService } from '../../../../atendimento.service';

interface Atendimento {
  id: number;
  nomeCliente: string;
  telefoneCliente: string;
  status: string;
  ultimaInteracao: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private atendimentoService = inject(AtendimentoService);

  atendimentos: Atendimento[] = [];
  carregando = true;
  erro = false;
  selecionadoId: number | null = null;
  termoBusca = '';

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.carregar();
    this.atendimentoService.recarregar$.subscribe(() => this.carregar());
  }

  carregar() {
    this.carregando = true;
    this.erro = false;
    this.cdr.detectChanges();

    this.http
      .get<Atendimento[]>(`${API_CONFIG.baseUrl}/api/atendimentos/meus`)
      .subscribe({
        next: (lista) => {
          this.atendimentos = lista;
          this.carregando = false;
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Erro ao carregar atendimentos', e);
          this.erro = true;
          this.carregando = false;
          this.cdr.detectChanges();
        },
      });
  }

  // Lista filtrada pelo que o usuário digita na busca (nome ou telefone)
  get atendimentosFiltrados(): Atendimento[] {
    const termo = this.termoBusca.trim().toLowerCase();
    if (!termo) return this.atendimentos;
    return this.atendimentos.filter(
      (a) =>
        a.nomeCliente?.toLowerCase().includes(termo) ||
        a.telefoneCliente?.toLowerCase().includes(termo),
    );
  }

  abrir(item: Atendimento) {
    this.selecionadoId = item.id;
    this.atendimentoService.selecionar(item);
  }

  iniciais(nome: string): string {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }

  hora(dataIso: string): string {
    if (!dataIso) return '';
    return new Date(dataIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}