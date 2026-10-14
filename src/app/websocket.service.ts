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
    if (isPlatformBrowser(this.platformId) && localStorage.getItem('token')) {
      this.conectar();
    }
  }

  conectar(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.stompClient?.active) return;

    const token = localStorage.getItem('token');

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(API_CONFIG.wsUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token.trim()}` } : {},
      reconnectDelay: 5000,
      debug: () => {},
    });

    this.stompClient.onConnect = () => {
      console.log('🔌 [WEB] WebSocket conectado com sucesso!');
      this.stompClient?.subscribe('/topic/mensagens', (message: Message) => {
        if (message.body) {
          try {
            this.mensagens$.next(JSON.parse(message.body));
          } catch (e) {
            console.error('Erro ao ler JSON do WebSocket', e);
          }
        }
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Erro STOMP:', frame.headers['message']);
    };

    this.stompClient.activate();
  }

  desconectar(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }
}
