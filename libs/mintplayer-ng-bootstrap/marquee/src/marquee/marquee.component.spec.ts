import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMarqueeComponent } from './marquee.component';

describe('BsMarqueeComponent', () => {
  let component: BsMarqueeComponent;
  let fixture: ComponentFixture<BsMarqueeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsMarqueeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsMarqueeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
