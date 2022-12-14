import { OverlayModule } from '@angular/cdk/overlay';
import { Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsToastTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { BsToastService } from '@mintplayer/ng-bootstrap/toast';
import { ToastComponent } from './toast.component';

@Component({
  selector: 'demo-toast-test',
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
  constructor(toastService: BsToastService) {
    this.toastService = toastService;
  }

  toastService: BsToastService;

  @ViewChild('toaster', { read: ElementRef }) toaster!: ElementRef<HTMLElement>;
  @ViewChild('toastTemplate') toastTemplate!: TemplateRef<any>;
  public showToast() {
    this.toastService.pushToast(this.toastTemplate);
  }
}

describe('ToastComponent', () => {
  let component: BsToastTestComponent;
  let fixture: ComponentFixture<BsToastTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,
        BsToastTestingModule,
      ],
      declarations: [
        // Unit to test
        ToastComponent,
        
        // Testbench
        BsToastTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsToastTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be callable', () => {
    const service = TestBed.inject(BsToastService);
    service.pushToast(component.toastTemplate);
  });
});
