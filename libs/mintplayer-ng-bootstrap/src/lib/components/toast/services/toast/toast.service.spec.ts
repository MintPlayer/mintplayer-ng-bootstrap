import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ElementRef, Injectable, Injector, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsToastService } from './toast.service';

@Component({
  selector: 'bs-toast-test',
  template: `
    <ng-template #toastTemplate let-message="message" let-isVisible="isVisible">
      <label>{{ message }}</label>
    </ng-template>
    <bs-toast-container #toaster></bs-toast-container>`
})
class BsToastTestComponent {
  constructor(toastService: BsToastService) {
    this.toastService = toastService;
  }

  toastService: BsToastService;

  @ViewChild('toaster', { read: ElementRef }) toaster!: ElementRef<HTMLElement>;
  @ViewChild('toastTemplate') toastTemplate!: TemplateRef<any>;
  public showToast() {
    this.toastService.pushToast(this.toastTemplate, { message: "Hello world" });
  }
}

@Component({
  selector: 'bs-toast-container',
  template: `
    <ng-container *ngFor="let toast of (toastService.toasts$ | async); let i = index">
      <ng-container [ngTemplateOutlet]="toast.template" [ngTemplateOutletContext]="toast.context"></ng-container>
    </ng-container>`
})
class BsToastContainerComponent {
  constructor(toastService: BsToastService) {
    this.toastService = toastService;
  }

  toastService: BsToastService;
}

describe('BsToastService', () => {
  let component: BsToastTestComponent;
  let fixture: ComponentFixture<BsToastTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test

        // Mock dependencies
        BsToastContainerComponent,

        // Testbench
        BsToastTestComponent
      ],
      imports: [
        OverlayModule
      ],
      providers: [
        {
          provide: PORTAL_FACTORY,
          useValue: (injector: Injector) => {
            return new ComponentPortal(BsToastContainerComponent, null, injector);
          }
        },
        BsToastService
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsToastTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should show a toast message', async () => {
    component.showToast();
    expect(component.toastService.toasts$.value.length).toEqual(1);

    fixture.detectChanges();
    const allToastLabels = component.toaster.nativeElement.querySelectorAll('label');
    expect(allToastLabels.length).toBe(1);
  });
});
