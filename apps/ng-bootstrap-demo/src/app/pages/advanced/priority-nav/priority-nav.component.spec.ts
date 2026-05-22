import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PriorityNavComponent } from './priority-nav.component';

describe('PriorityNavComponent (demo)', () => {
  let fixture: ComponentFixture<PriorityNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorityNavComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PriorityNavComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
