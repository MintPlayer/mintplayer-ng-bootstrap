import { Component, forwardRef, input, model, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsAlertComponent } from '../alert/alert.component';

import { BsAlertCloseComponent } from './alert-close.component';

@Component({
  selector: 'bs-alert',
  standalone: true,
  template: '<ng-content></ng-content>',
  providers: [
    { provide: BsAlertComponent, useExisting: forwardRef(() => BsAlertComponentStub) }
  ]
})
class BsAlertComponentStub {
  type = input<number>();
  isVisible = model<boolean>(true);
}

describe('BsAlertCloseComponent', () => {
  let component: BsAlertCloseTestComponent;
  let fixture: ComponentFixture<BsAlertCloseTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsAlertCloseComponent,

        // Mock components
        BsAlertComponentStub,

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
    expect(component.alert.isVisible()).toBe(false);
  });
});

@Component({
  selector: 'bs-alert-close-test',
  standalone: true,
  imports: [BsAlertComponentStub, BsAlertCloseComponent],
  template: `
  <bs-alert [type]="4" #alert>
    Cras justo odio
    <bs-alert-close #alertClose></bs-alert-close>
  </bs-alert>`
})
class BsAlertCloseTestComponent {
  @ViewChild('alert') alert!: BsAlertComponentStub;
  @ViewChild('alertClose') alertClose!: BsAlertCloseComponent;
}
