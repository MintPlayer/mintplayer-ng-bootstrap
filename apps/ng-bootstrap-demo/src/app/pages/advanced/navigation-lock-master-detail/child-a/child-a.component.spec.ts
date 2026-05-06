import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter, withRouterConfig } from '@angular/router';
import { MockComponent, MockDirective } from 'ng-mocks';
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';

import { ChildAComponent } from './child-a.component';
import { ConfirmDialogComponent } from '../../../../components/confirm-dialog/confirm-dialog.component';

describe('ChildAComponent', () => {
  let component: ChildAComponent;
  let fixture: ComponentFixture<ChildAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockDirective(BsNavigationLockDirective),
        MockComponent(ConfirmDialogComponent),

        // Unit to test (standalone)
        ChildAComponent,
      ],
      providers: [
        provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChildAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
