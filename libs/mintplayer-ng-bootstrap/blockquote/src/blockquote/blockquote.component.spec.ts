import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsBlockquoteComponent } from './blockquote.component';

describe('BsBlockquoteComponent', () => {
  let component: BsBlockquoteComponent;
  let fixture: ComponentFixture<BsBlockquoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsBlockquoteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsBlockquoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
