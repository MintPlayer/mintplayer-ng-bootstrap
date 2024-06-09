import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnteredViewComponent } from './entered-view.component';

describe('EnteredViewComponent', () => {
  let component: EnteredViewComponent;
  let fixture: ComponentFixture<EnteredViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnteredViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EnteredViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
