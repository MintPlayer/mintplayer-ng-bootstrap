import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragDropComponent } from './drag-drop.component';

@Directive({
  selector: '*[cdkDropList]',
  exportAs: 'cdkDropList'
})
class CdkDropListMockDirective<T = any> {
  @Input() cdkDropListData!: T;
  @Input() cdkDropListConnectedTo: (CdkDropListMockDirective | string)[] | CdkDropListMockDirective | string = [];
}

describe('DragDropComponent', () => {
  let component: DragDropComponent;
  let fixture: ComponentFixture<DragDropComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        DragDropComponent,
      
        // Mock dependencies
        CdkDropListMockDirective
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DragDropComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
