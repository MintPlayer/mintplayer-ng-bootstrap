import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PriorityNavigationComponent } from './priority-navigation.component';

describe('PriorityNavigationComponent', () => {
  let component: PriorityNavigationComponent;
  let fixture: ComponentFixture<PriorityNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorityNavigationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PriorityNavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
