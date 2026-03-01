import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MockComponent, MockDirective } from 'ng-mocks';

import { NavigationLockComponent } from './navigation-lock.component';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';

describe('NavigationLockComponent', () => {
  let component: NavigationLockComponent;
  let fixture: ComponentFixture<NavigationLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        FormsModule,
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonGroupDirective),
        MockDirective(BsNavigationLockDirective),
        NavigationLockComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavigationLockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
