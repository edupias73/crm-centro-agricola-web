import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { API_CONFIG } from './api.config'; // <-- Importa a configuração

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private stompClient: Client;
  public mensagens$ = new Subject<any>();

  constructor() {
    this.stompClient = new Client({
      // Aponta dinamicamente para a máquina local ou nuvem
      webSocketFactory: () => new SockJS(API_CONFIG.wsUrl),
      debug: (msg: string) => console.log('STOMP Debug:', msg),
    });

    this.stompClient.onConnect = (frame) => {
      console.log('🔌 [WEB] Conectado ao Java com sucesso!');

      this.stompClient.subscribe('/topic/mensagens', (message: Message) => {
        if (message.body) {
          const msgJson = JSON.parse(message.body);
          console.log('⚡ [WEB] Mensagem recebida ao vivo:', msgJson);
          this.mensagens$.next(msgJson);
        }
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Erro no STOMP: ', frame.headers['message']);
    };

    this.stompClient.activate();
  }
}