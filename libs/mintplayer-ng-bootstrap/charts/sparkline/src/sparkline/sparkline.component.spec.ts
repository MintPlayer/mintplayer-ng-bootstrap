import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSparklineComponent } from './sparkline.component';
import type { MpSparkline } from '@mintplayer/web-components/charts/sparkline';

describe('BsSparklineComponent', () => {
  let fixture: ComponentFixture<BsSparklineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsSparklineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsSparklineComponent);
    fixture.componentRef.setInput('points', [1, 2, null, 3]);
    fixture.detectChanges();
  });

  it('reflects the points input onto the <mp-sparkline> property', () => {
    const wc = fixture.nativeElement.querySelector('mp-sparkline') as MpSparkline;
    expect(wc.points).toEqual([1, 2, null, 3]);
  });
});
