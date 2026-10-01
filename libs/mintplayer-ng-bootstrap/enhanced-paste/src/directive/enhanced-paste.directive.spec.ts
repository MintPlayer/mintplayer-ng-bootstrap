import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NumberOverflow } from '../interfaces/number-overflow';
import { EnhancedPasteDirective } from './enhanced-paste.directive';

@Component({
  selector: 'enhanced-paste-test',
  imports: [FormsModule, EnhancedPasteDirective],
  template: `<input type="number" min="0" max="59" bsEnhancedPaste [(ngModel)]="minutes" (numberOverflow)="overflows.push($event)">`,
})
class EnhancedPasteTestComponent {
  minutes = 30;
  readonly overflows: NumberOverflow[] = [];
}

describe('EnhancedPasteDirective', () => {
  let fixture: ComponentFixture<EnhancedPasteTestComponent>;
  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const paste = (text: string) => {
    const ev = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
      clipboardData: { getData: () => text },
    });
    input().dispatchEvent(ev);
    fixture.detectChanges();
    return ev;
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(EnhancedPasteTestComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('lets an in-range paste through to the browser, and reports nothing', () => {
    expect(paste('12').defaultPrevented).toBe(false);
    expect(fixture.componentInstance.overflows).toEqual([]);
  });

  it('clamps a paste over max to max', async () => {
    expect(paste('75').defaultPrevented).toBe(true);
    expect(fixture.componentInstance.overflows).toEqual([{ boundary: 'max', inputValue: 75, boundaryValue: 59 }]);
    await fixture.whenStable();
    expect(input().value).toBe('59');
  });

  it('clamps a paste under a min of 0 to 0', async () => {
    paste('-4');
    expect(fixture.componentInstance.overflows).toEqual([{ boundary: 'min', inputValue: -4, boundaryValue: 0 }]);
    await fixture.whenStable();
    expect(input().value).toBe('0');
  });

  it('compares decimals as decimals', () => {
    paste('59.5');
    expect(fixture.componentInstance.overflows[0]).toEqual({ boundary: 'max', inputValue: 59.5, boundaryValue: 59 });
  });

  it('refuses text that is not a number and reports it as invalid', () => {
    expect(paste('abc').defaultPrevented).toBe(true);
    expect(fixture.componentInstance.overflows).toEqual([{ boundary: 'invalid' }]);
  });

  it('does nothing when the paste carries no clipboard data', () => {
    const ev = new Event('paste', { bubbles: true, cancelable: true });
    input().dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});
