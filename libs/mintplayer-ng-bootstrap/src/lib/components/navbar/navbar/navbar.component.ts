import { Component, ElementRef, Input, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class BsNavbarComponent {

  @ViewChild('nav') nav!: ElementRef;
  @Input() autoclose = true;

  expandButtonTemplate: TemplateRef<any> | null = null;
  
  isExpanded$ = new BehaviorSubject<boolean>(false);
  toggleExpanded() {
    this.isExpanded$.pipe(take(1)).subscribe((isExpanded) => {
      this.isExpanded$.next(!isExpanded);
    });
  }

  
}
