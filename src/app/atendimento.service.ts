import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AtendimentoResumo {
  id: number;
  nomeCliente: string;
  telefoneCliente: string;
  status: string;
  ultimaInteracao: string;
}

@Injectable({ providedIn: 'root' })
export class AtendimentoService {
  private selecionadoSubject = new Subject<AtendimentoResumo>();
  selecionado$ = this.selecionadoSubject.asObservable();

  private recarregarSubject = new Subject<void>();
  recarregar$ = this.recarregarSubject.asObservable();

  selecionar(atendimento: AtendimentoResumo) {
    this.selecionadoSubject.next(atendimento);
  }

  recarregarLista() {
    this.recarregarSubject.next();
  }
}