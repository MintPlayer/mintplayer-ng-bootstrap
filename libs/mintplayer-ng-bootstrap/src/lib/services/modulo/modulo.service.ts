import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModuloService {

  constructor() {
  }

  public modulo(n: number, m: number) {
    return ((n % m) + m) % m;
  }
  
}
