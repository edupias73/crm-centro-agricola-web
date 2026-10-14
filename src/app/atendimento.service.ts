import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface AtendimentoResumo {
  id: number;
  nomeCliente: string;
  telefoneCliente: string;
  status: string;
  ultimaInteracao: string;
  esperaMin?: number;
  setor?: string;
  categoria?: string;
}

export function parseDataUtcMs(dataIso?: string | null): number {
  if (!dataIso) return Date.now();
  const limpo = dataIso.trim();
  const comFuso =
    limpo.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(limpo) ? limpo : `${limpo}Z`;
  const ms = new Date(comFuso).getTime();
  return isNaN(ms) ? Date.now() : ms;
}

@Injectable({ providedIn: 'root' })
export class AtendimentoService {
  private selecionadoSubject = new BehaviorSubject<AtendimentoResumo | null>(null);
  selecionado$ = this.selecionadoSubject.asObservable();

  private modoSidebarSubject = new BehaviorSubject<'ATENCIONES' | 'CLIENTES'>('ATENCIONES');
  modoSidebar$ = this.modoSidebarSubject.asObservable();

  private recarregarSubject = new Subject<void>();
  recarregar$ = this.recarregarSubject.asObservable();

  get selecionadoAtual(): AtendimentoResumo | null {
    return this.selecionadoSubject.value;
  }

  selecionar(atendimento: AtendimentoResumo | null) {
    this.selecionadoSubject.next(atendimento);
  }

  mudarModoSidebar(modo: 'ATENCIONES' | 'CLIENTES') {
    this.modoSidebarSubject.next(modo);
  }

  recarregarLista() {
    this.recarregarSubject.next();
  }
}