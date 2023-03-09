import { Component } from '@angular/core';

@Component({
  selector: 'demo-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {

  example1PageNumbers: number[] = [10, 20, 50];
  example1SelectedPageNumber = 20;
  
  example2PageNumbers: number[] = [10, 20, 50];
  example2SelectedPageNumber = 20;

  example3PageNumbers: number[] = [...Array(10).keys()].map((p) => p + 1);
  example3SelectedPageNumber = 5;

  example4PageNumbers: number[] = [...Array(30).keys()].map((p) => p + 1);
  example4SelectedPageNumber = 15;

}
