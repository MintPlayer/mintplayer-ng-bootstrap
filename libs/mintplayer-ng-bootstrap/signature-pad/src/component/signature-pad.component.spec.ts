import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSignaturePadComponent } from './signature-pad.component';

describe('BsSignaturePadComponent', () => {
  let component: BsSignaturePadComponent;
  let fixture: ComponentFixture<BsSignaturePadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsSignaturePadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsSignaturePadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
