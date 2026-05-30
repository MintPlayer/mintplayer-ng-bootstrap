import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutofocusComponent } from './autofocus.component';

describe('AutofocusComponent', () => {
  let component: AutofocusComponent;
  let fixture: ComponentFixture<AutofocusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutofocusComponent],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AutofocusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
