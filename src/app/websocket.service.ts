import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { API_CONFIG } from './api.config';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private platformId = inject(PLATFORM_ID);
  private stompClient: Client | null = null;
  public mensagens$ = new Subject<any>();

  constructor() {
    // Só inicia se estiver no navegador (nunca no SSR da Vercel)
    if (isPlatformBrowser(this.platformId)) {
      this.inicializarCliente();
    }
  }

  private inicializarCliente() {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(API_CONFIG.wsUrl),
      reconnectDelay: 5000,
      // Desativa logs poluídos em produção; ative apenas se precisar debugar
      debug: () => {},
    });

    this.stompClient.onConnect = () => {
      console.log('🔌 [WEB] WebSocket conectado com sucesso!');
      this.stompClient?.subscribe('/topic/mensagens', (message: Message) => {
        if (message.body) {
          this.mensagens$.next(JSON.parse(message.body));
        }
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Erro STOMP:', frame.headers['message']);
    };

    this.stompClient.activate();
  }
}