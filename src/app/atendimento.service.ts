import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface AtendimentoResumo {
  id: number;
  nomeCliente: string;
  telefoneCliente: string;
  status: string;
  ultimaInteracao: string;
  setor?: string;
  categoria?: string;
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
