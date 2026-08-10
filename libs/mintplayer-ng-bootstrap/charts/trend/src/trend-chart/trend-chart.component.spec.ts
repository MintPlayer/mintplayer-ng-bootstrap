import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTrendChartComponent } from './trend-chart.component';
import type { MpTrendChart, TrendSeries } from '@mintplayer/web-components/charts/trend';

const SERIES: TrendSeries[] = [
  { id: 'cov', label: 'Coverage', points: [{ x: new Date(2026, 0, 1), y: 70 }, { x: new Date(2026, 0, 8), y: 80 }] },
];

describe('BsTrendChartComponent', () => {
  let fixture: ComponentFixture<BsTrendChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsTrendChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsTrendChartComponent);
    fixture.componentRef.setInput('series', SERIES);
    fixture.detectChanges();
  });

  function wc(): MpTrendChart {
    return fixture.nativeElement.querySelector('mp-trend-chart') as MpTrendChart;
  }

  it('reflects series and scalar inputs onto the <mp-trend-chart> properties', () => {
    expect(wc().series).toBe(SERIES);
    fixture.componentRef.setInput('goal', 80);
    fixture.componentRef.setInput('stacked', true);
    fixture.detectChanges();
    expect(wc().goal).toBe(80);
    expect(wc().stacked).toBe(true);
  });

  it('re-emits trend-point-select as the pointSelect output', () => {
    const selected: number[] = [];
    fixture.componentInstance.pointSelect.subscribe((d) => selected.push(d.point.y as number));
    wc().dispatchEvent(new CustomEvent('trend-point-select', {
      detail: { seriesId: 'cov', point: { x: 1, y: 70 } },
      bubbles: true,
      composed: true,
    }));
    expect(selected).toEqual([70]);
  });
});
