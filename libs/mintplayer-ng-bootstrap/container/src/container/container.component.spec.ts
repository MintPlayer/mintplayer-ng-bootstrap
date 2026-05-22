import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsContainerComponent } from './container.component';

describe('BsContainerComponent', () => {
  let component: BsContainerComponent;
  let fixture: ComponentFixture<BsContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsContainerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
