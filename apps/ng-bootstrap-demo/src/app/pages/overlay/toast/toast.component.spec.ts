import { OverlayModule } from '@angular/cdk/overlay';
import { Component, ElementRef, inject, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsToastModule, BsToastService } from '@mintplayer/ng-bootstrap/toast';
import { MockModule } from 'ng-mocks';
import { ToastComponent } from './toast.component';

@Component({
  selector: 'demo-toast-test',
  standalone: false,
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
  toastService = inject(BsToastService);

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
        MockModule(BsToastModule),
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
