import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Color } from '../../../enums';
import { BsAlertComponent } from '../alert/alert.component';

import { BsAlertCloseComponent } from './alert-close.component';

describe('BsAlertCloseComponent', () => {
  let component: BsAlertCloseTestComponent;
  let fixture: ComponentFixture<BsAlertCloseTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsAlertCloseComponent,
      
        // Mock components
        BsAlertMockComponent,

        // Testbench
        BsAlertCloseTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsAlertCloseTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close the alert', () => {
    const alertCloseBtn = fixture.debugElement.queryAll(By.css('bs-alert-close button'));
    if (!alertCloseBtn) {
      throw 'No close button found';
    }

    const closeBtn = <HTMLButtonElement>alertCloseBtn[0].nativeElement;
    if (!closeBtn) {
      throw 'Close button is not a HtmlButtonElement';
    }

    closeBtn.click();
    expect(component.alert.isVisible).toBe(false);
  });
});

@Component({
  selector: 'bs-alert-close-test',
  template: `
  <bs-alert [type]="4" #alert>
    Cras justo odio
    <bs-alert-close #alertClose></bs-alert-close>
  </bs-alert>`
})
class BsAlertCloseTestComponent {
  @ViewChild('alert') alert!: BsAlertMockComponent;
  @ViewChild('alertClose') alertClose!: BsAlertCloseComponent;
}

@Component({
  selector: 'bs-alert',
  template: `
  <div *ngIf="isVisible">
    <div class="alert mb-0">
      <ng-content></ng-content>
    </div>
  </div>`,
  providers: [
    { provide: BsAlertComponent, useExisting: BsAlertMockComponent }
  ]
})
class BsAlertMockComponent {
  isVisible: boolean = true;

  @Input() public type: Color = Color.primary;
}