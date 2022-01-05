import { Component, ElementRef, ViewChild } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class BsNavbarComponent {

  @ViewChild('nav') nav!: ElementRef;

  isExpanded$ = new BehaviorSubject<boolean>(false);
  toggleExpanded() {
    this.isExpanded$.pipe(take(1)).subscribe((isExpanded) => {
      this.isExpanded$.next(!isExpanded);
    });
  }

}
