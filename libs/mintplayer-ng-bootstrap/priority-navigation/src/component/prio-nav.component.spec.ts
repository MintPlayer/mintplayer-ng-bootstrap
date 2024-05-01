import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsPrioNavComponent } from './prio-nav.component';

describe('BsPrioNavComponent', () => {
  let component: BsPrioNavComponent;
  let fixture: ComponentFixture<BsPrioNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsPrioNavComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsPrioNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
