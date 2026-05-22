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

  it('should render the four primary tabs plus the Picture Tools contextual set', () => {
    // After the DOM-as-source-of-truth migration, tabs are
    // <bs-ribbon-tab> light-DOM children inside <bs-ribbon>. The demo
    // declares four primary tabs (Home / Insert / Design / Layout)
    // plus two more inside the Picture Tools
    // <bs-ribbon-contextual-tab-set> (Format / Effects). The contextual
    // tabs remain in the DOM even when the set is hidden — only the
    // ribbon's slot-processing logic filters them at render time.
    const allTabs = fixture.nativeElement.querySelectorAll('bs-ribbon-tab');
    expect(allTabs.length).toBe(6);
    const contextualTabs = fixture.nativeElement.querySelectorAll(
      'bs-ribbon-contextual-tab-set bs-ribbon-tab'
    );
    expect(contextualTabs.length).toBe(2);
    // Primary tabs = total minus the ones nested inside contextual sets.
    expect(allTabs.length - contextualTabs.length).toBe(4);
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
