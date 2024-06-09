import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObserveSizeComponent } from './observe-size.component';

describe('ObserveSizeComponent', () => {
  let component: ObserveSizeComponent;
  let fixture: ComponentFixture<ObserveSizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObserveSizeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ObserveSizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
