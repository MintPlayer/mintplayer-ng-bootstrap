import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ElementRef, Injector, signal, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsToastService } from './toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'bs-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (toast of toastService.toasts(); let i = $index; track i) {
      <ng-container [ngTemplateOutlet]="toast.template" [ngTemplateOutletContext]="toast.context"></ng-container>
    }`
})
class BsToastContainerComponent {
  constructor(toastService: BsToastService) {
    this.toastService = toastService;
  }

  toastService: BsToastService;
}

@Component({
  selector: 'bs-toast-test',
  standalone: true,
  imports: [BsToastContainerComponent],
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

describe('BsToastService', () => {
  let component: BsToastTestComponent;
  let fixture: ComponentFixture<BsToastTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,

        // Unit to test
        BsToastContainerComponent,
        // Testbench
        BsToastTestComponent
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
    expect(component.toastService.toasts().length).toEqual(1);

    fixture.detectChanges();
    const allToastLabels = component.toaster.nativeElement.querySelectorAll('label');
    expect(allToastLabels.length).toBe(1);
  });
});
