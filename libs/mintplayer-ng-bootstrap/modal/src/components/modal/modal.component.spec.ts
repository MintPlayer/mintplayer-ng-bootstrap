import { OverlayModule } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';
import { BsModalDirective } from '../../directives/modal/modal.directive';
import { BsModalHostComponent } from '../modal-host/modal-host.component';
import { BsModalComponent } from './modal.component';

@Component({
  selector: 'bs-modal-test',
  standalone: false,
  template: `
    <bs-modal [(isOpen)]="isOpen">
      <div *bsModal>
        <div bsModalHeader>Modal title</div>
        <div bsModalBody>Modal body</div>
        <div bsModalFooter>Footer</div>
      </div>
    </bs-modal>`
})
class BsModalTestComponent { }

describe('BsModalComponent', () => {
  let component: BsModalTestComponent;
  let fixture: ComponentFixture<BsModalTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(OverlayModule),
        NoopAnimationsModule
      ],
      declarations: [
        // Unit to test
        BsModalComponent,

        // Mock dependencies
        MockComponent(BsModalHostComponent),
        MockDirective(BsModalDirective),

        // Testbench
        BsModalTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
