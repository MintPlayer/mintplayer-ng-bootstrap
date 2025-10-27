import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DockComponent } from './dock.component';

describe('DockComponent', () => {
  let component: DockComponent;
  let fixture: ComponentFixture<DockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DockComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
