import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../api.config';

export interface ResumoOperacao {
  conversacionesActivas: number;
  enLaFila: number;
  fueraDeSla: number;
  limiteSlaMinutos: number;
  clientesRegistrados: number;
  mayoristas: number;
  minoristas: number;
}

export interface CustoVendedor {
  id: number;
  nome: string;
  email: string;
  sector: string;
  mkt: number;
  util: number;
  auth: number;
  servico24h: number;
  totalMensagens: number;
  gastoPlantillasGuaranies: number;
}

export interface RelatorioCustosMeta {
  gastoTotalGuaranies: number;
  totalMensagensEnviadas: number;
  totalMensagensPagas: number;
  custoMedioPorMensagemPaga: number;
  orcamentoMensalGuaranies: number;
  franquiaMensalServico: number;
  servicoTotalEnviadas: number;
  servicoGratisUsadas: number;
  servicoExcedenteCobradas: number;
  custoServicoGuaranies: number;
  mktCount: number;
  custoMktGuaranies: number;
  utilCount: number;
  custoUtilGuaranies: number;
  authCount: number;
  custoAuthGuaranies: number;
  porVendedor: CustoVendedor[];
}

export interface ConversaSupervisao {
  id: number;
  nome: string;
  tel: string;
  sector: string;
  vendedor: string;
  msg: string;
  hora: string;
  cat: string;
  esperaMin: number;
  status: string;
}

export interface ClienteAdmin {
  id: number;
  ultimoAtendimentoId: number | null;
  nome: string;
  tel: string;
  ciudad: string;
  sector: string;
  vendedor: string;
  conv: number;
  ultimo: string;
  emConversa: boolean;
}

export interface UsuarioAdmin {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  sector: string;
  cargaHoraria: string;
  estado: string;
  ativas: number;
  ativo: boolean;
}

export interface NovoUsuarioPayload {
  nome: string;
  email: string;
  senha?: string;
  setor: string;
  perfil: string;
}

export interface NovaConversaPayload {
  telefone: string;
  nomeCliente: string;
  sector: string;
  plantillaNome: string;
  textoPrevia: string;
  vendedorId: number | null;
}

export interface ItemAuditoria {
  hora: string;
  evento: string;
  tipo: string;
  usuario: string;
  detalhe: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private base = API_CONFIG.baseUrl;

  obterResumo(): Observable<ResumoOperacao> {
    return this.http.get<ResumoOperacao>(`${this.base}/api/admin/resumo`);
  }

  obterCustosMeta(periodo: 'MES' | 'ANTERIOR' | 'ANO' = 'MES'): Observable<RelatorioCustosMeta> {
    return this.http.get<RelatorioCustosMeta>(`${this.base}/api/admin/custos?periodo=${periodo}`);
  }

  listarConversas(): Observable<ConversaSupervisao[]> {
    return this.http.get<ConversaSupervisao[]>(`${this.base}/api/admin/conversas`);
  }

  listarClientes(): Observable<ClienteAdmin[]> {
    return this.http.get<ClienteAdmin[]>(`${this.base}/api/admin/clientes`);
  }

  iniciarConversa(payload: NovaConversaPayload): Observable<ConversaSupervisao> {
    return this.http.post<ConversaSupervisao>(`${this.base}/api/admin/iniciar-conversa`, payload);
  }

  listarAuditoria(): Observable<ItemAuditoria[]> {
    return this.http.get<ItemAuditoria[]>(`${this.base}/api/admin/auditoria`);
  }

  listarUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.base}/api/usuarios`);
  }

  criarUsuario(payload: NovoUsuarioPayload): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(`${this.base}/api/usuarios`, payload);
  }

  alterarStatusAtivo(id: number, ativo: boolean): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.base}/api/usuarios/${id}/ativo`, { ativo });
  }
}