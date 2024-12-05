import { OverlayModule } from '@angular/cdk/overlay';
import { Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsToastCloseDirective } from './toast-close.directive';
import { MockComponent } from 'ng-mocks';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close/src/close.component';
import { BsToastContainerComponent } from '../../components/toast-container/toast-container.component';
import { BsToastBodyComponent } from '../../components/toast-body/toast-body.component';
import { BsToastHeaderComponent } from '../../components/toast-header/toast-header.component';
import { BsToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'bs-toast-test',
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
  @ViewChild('toaster', { read: ElementRef }) toaster!: ElementRef<HTMLElement>;
  @ViewChild('toastTemplate') toastTemplate!: TemplateRef<any>;
  public showToast() {}
}

describe('BsToastCloseDirective', () => {
  let component: BsToastTestComponent;
  let fixture: ComponentFixture<BsToastTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,
        MockComponent(BsCloseComponent),
      ],
      declarations: [
        // Unit to test
        BsToastCloseDirective,

        // Mock dependencies
        MockComponent(BsToastContainerComponent),
        MockComponent(BsToastComponent),
        MockComponent(BsToastHeaderComponent),
        MockComponent(BsToastBodyComponent),
        
        // Testbench
        BsToastTestComponent,
      ],
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
