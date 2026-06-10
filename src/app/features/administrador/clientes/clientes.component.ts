import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ClienteApiService } from '../../services/cliente.service';
import type { ClienteDto } from '../../services/cliente.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css'],
})
export class ClientesComponent implements OnInit {
  clientes: ClienteDto[] = [];
  loading = false;

  constructor(private api: ClienteApiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.api.list().subscribe({ next: (c) => { this.clientes = c || []; this.loading = false; }, error: () => (this.loading = false) });
  }
}
