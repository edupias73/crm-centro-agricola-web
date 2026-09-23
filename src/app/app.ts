import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // <-- A importação obrigatória
import { WebsocketService } from './websocket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet], // <-- O Angular precisa disso aqui dentro!
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  constructor(private wsService: WebsocketService) {}

  ngOnInit() {
    this.wsService.mensagens$.subscribe((mensagemNova) => {
      console.log('MÁGICA ACONTECENDO! Chegou no front:', mensagemNova);
    });
  }
}
