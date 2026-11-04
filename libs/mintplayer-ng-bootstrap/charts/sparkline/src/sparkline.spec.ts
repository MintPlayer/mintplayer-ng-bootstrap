import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSparklineComponent } from './generated';

@Component({
  imports: [BsSparklineComponent],
  template: `<bs-sparkline [points]="points()" [area]="area()" [inputLabel]="label()" [yMin]="yMin()" [yMax]="yMax()" />`,
})
class HostComponent {
  readonly points = signal<(number | null)[]>([1, 2, null, 3]);
  readonly area = signal(false);
  readonly label = signal<string | null>(null);
  readonly yMin = signal<number | null | undefined>(undefined);
  readonly yMax = signal<number | null | undefined>(undefined);
}

describe('BsSparklineComponent (generated)', () => {
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

  // #461: numberAttribute(undefined) is NaN, so an unset bound drew "M 3 NaN L 97 NaN".
  it('leaves a y bound set to undefined or null automatic, not NaN', () => {
    const sparkline = () => fixture.debugElement.query((d) => d.componentInstance instanceof BsSparklineComponent).componentInstance as BsSparklineComponent;
    fixture.componentInstance.points.set([1474276010.667, 1417019392]);
    fixture.detectChanges();
    expect(sparkline().yMin()).toBeNull();
    expect(sparkline().yMax()).toBeNull();
    expect(svg()?.querySelector('path.line')?.getAttribute('d')).not.toContain('NaN');
    expect(svg()?.querySelector('circle.dot')?.getAttribute('cy')).not.toBe('NaN');
    fixture.componentInstance.yMin.set(null);
    fixture.componentInstance.yMax.set(0);
    fixture.detectChanges();
    expect(sparkline().yMin()).toBeNull();
    expect(sparkline().yMax()).toBe(0);
  });

  it('fills the area on request, and hides an empty box without points', () => {
    fixture.componentInstance.area.set(true);
    fixture.detectChanges();
    expect(svg()?.querySelector('path.fill')).not.toBeNull();
    fixture.componentInstance.points.set([null]);
    fixture.detectChanges();
    expect(svg()?.hasAttribute('role')).toBe(false);
    expect(svg()?.getAttribute('aria-hidden')).toBe('true');
    expect(svg()?.querySelector('path')).toBeNull();
  });
});
