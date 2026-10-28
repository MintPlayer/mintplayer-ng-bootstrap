import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsHierarchyChartComponent, type HierarchyNode } from '@mintplayer/ng-bootstrap/charts/hierarchy';

const DATA: HierarchyNode = {
  id: 'repo',
  name: 'repo',
  children: [
    { id: 'src', name: 'src', children: [{ id: 'a', name: 'a.ts', value: 10, colorValue: 80 }] },
    { id: 'tools', name: 'tools', value: 5, colorValue: 50 },
  ],
};

// The generated front renders the headless chart itself (#437): the treeitems
// are its own nodes, so the spec reads the DOM instead of element properties.
describe('BsHierarchyChartComponent', () => {
  let fixture: ComponentFixture<BsHierarchyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsHierarchyChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsHierarchyChartComponent);
    fixture.componentRef.setInput('data', DATA);
    fixture.detectChanges();
  });

  const item = (id: string): Element | null =>
    fixture.nativeElement.querySelector(`[role="treeitem"][data-id="${id}"]`);

  it('renders the data in the chosen layout', () => {
    expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
    fixture.componentRef.setInput('layout', 'icicle');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
    expect(fixture.nativeElement.querySelector('.icicle')).not.toBeNull();
    expect(item('tools')).not.toBeNull();
  });

  it('drives the controlled root-id via the model input', () => {
    fixture.componentRef.setInput('rootId', 'src');
    fixture.detectChanges();
    expect(item('a')).not.toBeNull();
    expect(item('tools')).toBeNull();
  });

  it('updates the rootId model and emits zoom when the chart re-roots', () => {
    const zooms: string[] = [];
    fixture.componentInstance.zoom.subscribe((d) => zooms.push(d.node.id));
    fixture.componentInstance.zoomTo('src');
    fixture.detectChanges();
    expect(zooms).toEqual(['src']);
    expect(fixture.componentInstance.rootId()).toBe('src');
  });

  it('names nodes through a labelFormatter', () => {
    fixture.componentRef.setInput('labelFormatter', (n: HierarchyNode) => `#${n.id}`);
    fixture.detectChanges();
    expect(item('src')?.getAttribute('aria-label')).toMatch(/^#src/);
  });
});
