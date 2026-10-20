import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSparklineComponent } from './sparkline.component';

@Component({
  imports: [BsSparklineComponent],
  template: `<bs-sparkline [points]="points()" [area]="area()" [inputLabel]="label()" />`,
})
class HostComponent {
  readonly points = signal<(number | null)[]>([1, 2, null, 3]);
  readonly area = signal(false);
  readonly label = signal<string | undefined>(undefined);
}

describe('BsSparklineComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const host = () => fixture.nativeElement.querySelector('bs-sparkline') as HTMLElement;
  const svg = () => host().querySelector('svg');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders its own svg into the sized, scoped box', () => {
    expect(host().classList).toContain('sparkline');
    expect(host().getAttribute('data-mps')).toBe('sparkline');
    expect(svg()?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg()?.getAttribute('viewBox')).toBe('0 0 100 28');
    expect(svg()?.getAttribute('role')).toBe('img');
    // A null is a gap: two runs, two move-tos.
    expect(svg()?.querySelector('path.line')?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
    expect(svg()?.querySelector('circle.dot')).not.toBeNull();
    expect(svg()?.querySelector('path.fill')).toBeNull();
  });

  it('names the chart from the series, or from inputLabel', () => {
    expect(svg()?.getAttribute('aria-label')).toBe('1, 3, 1, 3');
    fixture.componentInstance.label.set('Coverage trend');
    fixture.detectChanges();
    expect(svg()?.getAttribute('aria-label')).toBe('Coverage trend');
  });

  it('fills the area on request and draws nothing without points', () => {
    fixture.componentInstance.area.set(true);
    fixture.detectChanges();
    expect(svg()?.querySelector('path.fill')).not.toBeNull();
    fixture.componentInstance.points.set([null]);
    fixture.detectChanges();
    expect(svg()).toBeNull();
  });
});
