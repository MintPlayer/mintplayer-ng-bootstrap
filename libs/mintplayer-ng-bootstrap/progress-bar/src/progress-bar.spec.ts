import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BsProgressBarComponent, BsProgressComponent } from './index';

@Component({
  selector: 'bs-progress-test',
  template: `<bs-progress><bs-progress-bar [value]="82" color="success" label="Coverage" /></bs-progress>`,
  imports: [BsProgressComponent, BsProgressBarComponent],
})
class BsProgressTestComponent {}

describe('BsProgressBarComponent', () => {
  // #460: the bar's template root is not its host, so the compiler passes the group scope to the
  // runtime. Without it the `.progress-bar-host[data-mps=progress] { display: contents }` rule never
  // matched, the host stayed a 0px flex item and the 82% fill resolved against 0px.
  it('stamps the group scope on its host beside the core host class', () => {
    const fixture = TestBed.createComponent(BsProgressTestComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('bs-progress-bar') as HTMLElement;
    expect(host.classList.contains('progress-bar-host')).toBe(true);
    expect(host.getAttribute('data-mps')).toBe('progress');
    expect(host.querySelector('.progress-bar')?.getAttribute('data-progress')).toBe('82');
  });
});
