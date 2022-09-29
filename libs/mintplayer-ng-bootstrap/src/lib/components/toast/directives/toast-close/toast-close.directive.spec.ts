import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ElementRef, EventEmitter, Injectable, Injector, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsToastCloseDirective } from './toast-close.directive';

@Injectable()
class BsToastMockService {
  constructor(private overlayService: Overlay, private rootInjector: Injector) { }

  public pushToast(toast: TemplateRef<any>) {
    const portal = new ComponentPortal(BsToastMockComponent, null, this.rootInjector);
    const overlayRef = this.overlayService.create({});
    const component = overlayRef.attach<BsToastMockComponent>(portal);
  }
}

@Component({
  selector: 'bs-toast-test',
  template: `
    <ng-template #toastTemplate let-message="message" let-isVisible="isVisible">
      <bs-toast [isVisible]="isVisible">
        <bs-toast-header>
          <strong class="me-auto">Bootstrap</strong>
          <small class="text-muted">11 mins ago</small>
          <bs-close></bs-close>
        </bs-toast-header>
        <bs-toast-body>{{ message }}</bs-toast-body>
      </bs-toast>
    </ng-template>
    <bs-toast-container #toaster></bs-toast-container>`
})
class BsToastTestComponent {
  constructor(toastService: BsToastMockService) {
    this.toastService = toastService;
  }

  toastService: BsToastMockService;

  @ViewChild('toaster', { read: ElementRef }) toaster!: ElementRef<HTMLElement>;
  @ViewChild('toastTemplate') toastTemplate!: TemplateRef<any>;
  public showToast() {
    this.toastService.pushToast(this.toastTemplate);
  }
}

@Component({
  selector: 'bs-close',
  template: `<button type="button" (click)="onClose($event)"></button>`,
})
class BsCloseMockComponent {
  @Output() click = new EventEmitter<any>();
  onClose(ev: MouseEvent) {
    this.click.emit();
    ev.stopImmediatePropagation();
  }
}

@Component({
  selector: 'bs-toast-container',
  template: `
    <ng-container *ngFor="let toast of (toastService.toasts$ | async); let i = index">
      <ng-container [ngTemplateOutlet]="toast.template" [ngTemplateOutletContext]="toast.context | bsAddProperties: {toastIndex: i}"></ng-container>
    </ng-container>`,
})
class BsToastContainerMockComponent {
  constructor(toastService: BsToastMockService) {
    this.toastService = toastService;
  }

  toastService: BsToastMockService;
}

@Component({
  selector: 'bs-toast',
  template: `
    <div [class.show]="isVisible">
      <ng-content></ng-content>
    </div>`
})
class BsToastMockComponent {
  @Input() public isVisible = false;
}

@Component({
  selector: 'bs-toast-header',
  template: `<ng-content></ng-content>`
})
class BsToastHeaderMockComponent { }

@Component({
  selector: 'bs-toast-body',
  template: `<ng-content></ng-content>`
})
class BsToastBodyMockComponent {
  constructor() {}
}

describe('BsToastCloseDirective', () => {
  let component: BsToastTestComponent;
  let fixture: ComponentFixture<BsToastTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,
      ],
      declarations: [
        // Unit to test
        BsToastCloseDirective,

        // Mock dependencies
        BsCloseMockComponent,
        BsToastContainerMockComponent,
        BsToastMockComponent,
        BsToastHeaderMockComponent,
        BsToastBodyMockComponent,
        
        // Testbench
        BsToastTestComponent,
      ],
      providers: [
        BsToastMockService,
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

});
