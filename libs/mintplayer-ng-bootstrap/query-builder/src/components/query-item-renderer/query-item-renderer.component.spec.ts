import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsQueryItemRendererComponent } from './query-item-renderer.component';

interface Item {
  description: string;
}

describe('BsQueryItemRendererComponent', () => {
  let component: BsQueryItemRendererComponent<Item>;
  let fixture: ComponentFixture<BsQueryItemRendererComponent<Item>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsQueryItemRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsQueryItemRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
