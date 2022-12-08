import { Component } from '@angular/core';

@Component({
  selector: 'demo-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent {

  disableSelectBox = false;
  selectedDishBootstrapSelect: Dish | null = null;
  dishes: Dish[] = [
    { id: 1, name: 'Salmon', description: 'Salmon with mini-tomatoes', ingredients: ['Salmon', 'tomatoes', 'Pepper sauce'] },
    { id: 2, name: 'Spaghetti', description: 'Spaghetti Bolognaise', ingredients: ['Pasta', 'Minced meat', 'Tomato sauce', 'Mushrooms'] },
    { id: 3, name: 'Lasagna', description: 'Lasagna Bolognaise', ingredients: ['Pasta', 'Minced meat', 'Tomato sauce', 'Cheese'] },
  ]

}

interface Dish {
  id: number;
  name: string;
  description: string;
  ingredients: string[];
}