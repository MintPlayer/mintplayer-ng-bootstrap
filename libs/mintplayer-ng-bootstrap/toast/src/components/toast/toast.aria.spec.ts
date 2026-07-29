import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';
import { BsToastComponent, BsToastPoliteness } from './toast.component';

@Component({
  selector: 'bs-toast-aria-harness',
  imports: [BsToastComponent],
  template: `<bs-toast [isVisible]="visible()" [politeness]="politeness()">Saved successfully</bs-toast>`,
})
class HarnessComponent {
  visible = signal(false);
  politeness = signal<BsToastPoliteness>('assertive');
}

describe('BsToastComponent ARIA (Phase E: announcer service is the channel)', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;
  let announced: Array<{ message: string; politeness?: string }>;

  beforeEach(async () => {
    announced = [];
    await TestBed.configureTestingModule({
      imports: [HarnessComponent],
      providers: [
        {
          provide: BsLiveAnnouncerService,
          useValue: {
            announce: (message: string, politeness?: string) => {
              announced.push({ message, politeness });
              return Promise.resolve();
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const toast = () => fixture.nativeElement.querySelector<HTMLElement>('.toast')!;

  it('carries NO role/aria-live of its own — region-and-text mounting in one task is never announced (audit 4.8)', () => {
    expect(toast().hasAttribute('role')).toBe(false);
    expect(toast().hasAttribute('aria-live')).toBe(false);
  });

  it('announces its text through the shared announcer when shown', async () => {
    host.visible.set(true);
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    expect(announced).toEqual([{ message: 'Saved successfully', politeness: 'assertive' }]);
  });

  it('politeness flows through to the announcer', async () => {
    host.politeness.set('polite');
    host.visible.set(true);
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    expect(announced[0]?.politeness).toBe('polite');
  });

  it('a hidden toast announces nothing', async () => {
    await Promise.resolve();
    expect(announced).toEqual([]);
  });
});
