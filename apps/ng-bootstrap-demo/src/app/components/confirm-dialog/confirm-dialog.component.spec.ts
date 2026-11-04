import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockDirective } from 'ng-mocks';
import { BsModalComponent, BsModalFooterDirective, BsModalHeaderDirective } from '@mintplayer/ng-bootstrap/modal';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsModalComponent),
        MockDirective(BsModalHeaderDirective),
        MockDirective(BsModalFooterDirective),

        // Unit to test (standalone)
        ConfirmDialogComponent,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
