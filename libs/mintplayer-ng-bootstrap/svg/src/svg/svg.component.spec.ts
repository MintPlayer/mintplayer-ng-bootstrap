import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSvgComponent } from './svg.component';

describe('BsSvgComponent', () => {
  let component: BsSvgComponent;
  let fixture: ComponentFixture<BsSvgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsSvgComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsSvgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
