import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsNavigationLockDirective } from './navigation-lock.directive';

@Component({
  selector: 'navigation-lock-test',
  standalone: false,
  template: `
    <ng-container bsNavigationLock [canExit]="canExit" #navigationLock="bsNavigationLock">
    </ng-container>`
})
class NavigationLockTestComponent {
  canExit = true;
}

describe('BsNavigationLockDirective', () => {
  let component: NavigationLockTestComponent;
  let fixture: ComponentFixture<NavigationLockTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([])
      ],
      declarations: [
        // Unit to test
        BsNavigationLockDirective,

        // Testbench
        NavigationLockTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavigationLockTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
