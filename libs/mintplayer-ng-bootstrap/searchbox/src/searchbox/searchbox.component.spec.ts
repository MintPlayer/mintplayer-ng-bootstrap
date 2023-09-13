import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSearchboxComponent } from './searchbox.component';

describe('BsSearchboxComponent', () => {
  let component: BsSearchboxComponent;
  let fixture: ComponentFixture<BsSearchboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsSearchboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsSearchboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
