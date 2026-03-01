import { JsonPipe } from '@angular/common';
import { Component, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  imports: [JsonPipe, FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsSelectComponent, BsSelectOption, BsToggleButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectComponent {

  disableSelectBox = model(false);
  selectedDishBootstrapSelect = model<Dish | null>(null);
  dishes: Dish[] = [
    { id: 1, name: 'Salmon', description: 'Salmon with mini-tomatoes', ingredients: ['Salmon', 'tomatoes', 'Pepper sauce'] },
    { id: 2, name: 'Spaghetti', description: 'Spaghetti Bolognaise', ingredients: ['Pasta', 'Minced meat', 'Tomato sauce', 'Mushrooms'] },
    { id: 3, name: 'Lasagna', description: 'Lasagna Bolognaise', ingredients: ['Pasta', 'Minced meat', 'Tomato sauce', 'Cheese'] },
  ];
}

interface Dish {
  id: number;
  name: string;
  description: string;
  ingredients: string[];
}