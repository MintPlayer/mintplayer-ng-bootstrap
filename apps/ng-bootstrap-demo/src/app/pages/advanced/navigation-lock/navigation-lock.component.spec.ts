import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, withRouterConfig } from '@angular/router';
import { MockComponent, MockDirective } from 'ng-mocks';

import { NavigationLockComponent } from './navigation-lock.component';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsNavigationLockDirective } from '@mintplayer/ng-bootstrap/navigation-lock';

describe('NavigationLockComponent', () => {
  let component: NavigationLockComponent;
  let fixture: ComponentFixture<NavigationLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        FormsModule,
        MockComponent(BsCheckboxComponent),
        MockDirective(BsNavigationLockDirective),
        NavigationLockComponent,
      ],
      providers: [
        provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
      ],
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
