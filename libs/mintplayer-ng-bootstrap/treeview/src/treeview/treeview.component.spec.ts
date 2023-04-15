import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTreeviewComponent } from './treeview.component';

describe('BsTreeviewComponent', () => {
  let component: BsTreeviewComponent;
  let fixture: ComponentFixture<BsTreeviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsTreeviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsTreeviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
