import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DragDropModule as CdkDragDropModule } from '@angular/cdk/drag-drop';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.scss'],
  imports: [CdkDragDropModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragDropComponent {

  toDoItems: string[] = ['Faith Hilling', 'Planking', 'Owling', 'Bradying', 'Tebowing', 'Poodle Fisting', 'Taylor Swifting', 'Cat Breading', 'Fonzying', 'Mustaching', 'Reporting'];
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

  protected readonly snippetBasicHtml = dedent`
    <div cdkDropList [cdkDropListData]="items" (cdkDropListDropped)="onDrop($event)">
      @for (item of items; track item) {
        <div class="task-item" cdkDrag>{{ item }}</div>
      }
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
    @Component({
      selector: 'my-drag-drop-demo',
      templateUrl: './my-drag-drop-demo.component.html',
      imports: [DragDropModule],
    })
    export class MyDragDropDemoComponent {
      items = ['Apple', 'Banana', 'Cherry', 'Date'];

      onDrop(event: CdkDragDrop<string[]>) {
        moveItemInArray(this.items, event.previousIndex, event.currentIndex);
      }
    }
  `;
}
