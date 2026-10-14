import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, Observable, merge, interval, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from './api.config';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);
  private stompClient: Client | null = null;

  public mensagens$ = new Subject<any>();

  // Emite sempre que chega WebSocket OU a cada 15 segundos para manter SLA, KPIs e listas vivos sem clique
  public pulsoTempoReal$: Observable<void>;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.pulsoTempoReal$ = merge(
        this.mensagens$.pipe(map(() => void 0)),
        interval(15000).pipe(map(() => void 0)),
      );

      if (localStorage.getItem('token')) {
        this.conectar();
      }
    } else {
      this.pulsoTempoReal$ = EMPTY;
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
      console.log('🔌 [WEB] WebSocket conectado em tempo real!');
      this.stompClient?.subscribe('/topic/mensagens', (message: Message) => {
        if (message.body) {
          try {
            const payload = JSON.parse(message.body);
            // NgZone.run força o Angular a atualizar a tela imediatamente sem precisar de clique!
            this.zone.run(() => {
              this.mensagens$.next(payload);
            });
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