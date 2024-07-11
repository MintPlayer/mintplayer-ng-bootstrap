import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent, MockModule } from 'ng-mocks';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';
import { BsNavigationLockModule } from '@mintplayer/ng-bootstrap/navigation-lock';
import { NavigationLockComponent } from './navigation-lock.component';

describe('NavigationLockComponent', () => {
  let component: NavigationLockComponent;
  let fixture: ComponentFixture<NavigationLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsCheckboxModule),
        MockModule(BsNavigationLockModule),
      ],
      declarations: [
        // Unit to test
        NavigationLockComponent
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
