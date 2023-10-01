import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsQueryBuilderComponent } from './query-builder.component';

interface Item {
  description: string;
}

describe('BsQueryBuilderComponent', () => {
  let component: BsQueryBuilderComponent<Item>;
  let fixture: ComponentFixture<BsQueryBuilderComponent<Item>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsQueryBuilderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsQueryBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
