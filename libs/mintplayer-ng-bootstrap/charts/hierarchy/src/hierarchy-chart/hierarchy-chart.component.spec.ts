import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsHierarchyChartComponent } from './hierarchy-chart.component';
import type { HierarchyNode, MpHierarchyChart } from '@mintplayer/web-components/charts/hierarchy';

const DATA: HierarchyNode = {
  id: 'repo',
  name: 'repo',
  children: [
    { id: 'src', name: 'src', children: [{ id: 'a', name: 'a.ts', value: 10, colorValue: 80 }] },
    { id: 'tools', name: 'tools', value: 5, colorValue: 50 },
  ],
};

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

  function wc(): MpHierarchyChart {
    return fixture.nativeElement.querySelector('mp-hierarchy-chart') as MpHierarchyChart;
  }

  it('reflects data and layout inputs onto the <mp-hierarchy-chart> properties', () => {
    expect(wc().data).toBe(DATA);
    fixture.componentRef.setInput('layout', 'icicle');
    fixture.detectChanges();
    expect(wc().layout).toBe('icicle');
  });

  it('drives the controlled root-id via the model input', () => {
    fixture.componentRef.setInput('rootId', 'src');
    fixture.detectChanges();
    expect(wc().rootId).toBe('src');
  });

  it('updates the rootId model and re-emits when the WC zooms', () => {
    const zooms: string[] = [];
    fixture.componentInstance.zoom.subscribe((d) => zooms.push(d.node.id));
    wc().zoomTo('src');
    fixture.detectChanges();
    expect(zooms).toEqual(['src']);
    expect(fixture.componentInstance.rootId()).toBe('src');
  });

  it('forwards function properties (loadChildren, formatters)', () => {
    const loader = () => Promise.resolve([]);
    const formatter = () => 'x';
    fixture.componentRef.setInput('loadChildren', loader);
    fixture.componentRef.setInput('labelFormatter', formatter);
    fixture.detectChanges();
    expect(wc().loadChildren).toBe(loader);
    expect(wc().labelFormatter).toBe(formatter);
  });
});
