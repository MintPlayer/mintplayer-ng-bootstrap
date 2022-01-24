import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';

@Component({
  selector: 'demo-drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.scss']
})
export class DragDropComponent {

  toDoItems: string[] = ['Dusting off', 'Vacuuming', 'Mopping', 'Scrubbing', 'Gardening', 'Planking', 'Owling', 'Faith hilling', 'Tebowing', 'Taylor Swifting'];
  inProgressItems: string[] = [];
  doneItems: string[] = [];

  taskDropped(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data, 
        event.previousIndex, 
        event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex);
    }
  }

}
