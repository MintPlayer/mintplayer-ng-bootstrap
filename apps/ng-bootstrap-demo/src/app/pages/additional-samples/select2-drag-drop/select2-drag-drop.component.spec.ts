import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Select2DragDropComponent } from './select2-drag-drop.component';

describe('Select2DragDropComponent', () => {
  let component: Select2DragDropComponent;
  let fixture: ComponentFixture<Select2DragDropComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Select2DragDropComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(Select2DragDropComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
