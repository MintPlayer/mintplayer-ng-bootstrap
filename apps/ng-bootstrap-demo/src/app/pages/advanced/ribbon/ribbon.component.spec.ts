import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RibbonComponent } from './ribbon.component';

describe('RibbonComponent', () => {
  let component: RibbonComponent;
  let fixture: ComponentFixture<RibbonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RibbonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RibbonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render tabs', () => {
    expect(component.tabs.length).toBe(4);
  });

  it('should toggle minimized state', () => {
    expect(component.minimized()).toBe(false);
    component.toggleMinimized();
    expect(component.minimized()).toBe(true);
  });

  it('should toggle layout', () => {
    expect(component.layout()).toBe('classic');
    component.toggleLayout();
    expect(component.layout()).toBe('simplified');
  });
});
