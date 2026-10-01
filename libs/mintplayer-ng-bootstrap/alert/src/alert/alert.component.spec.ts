import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertCloseComponent } from '../alert-close/alert-close.component';
import { NoopAnimationsModule, provideNoopAnimations } from '@angular/platform-browser/animations';

import { BsAlertComponent } from './alert.component';

describe('AlertComponent', () => {
  let component: BsAlertComponent;
  let fixture: ComponentFixture<BsAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        BsAlertComponent
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  imports: [BsAlertComponent, BsAlertCloseComponent],
  template: `
    <button type="button" class="before">before</button>
    <bs-alert [type]="colors.warning" [announce]="announce()" [(isVisible)]="visible" (afterOpenedOrClosed)="events.push($event)">
      Careful <bs-alert-close [ariaLabel]="closeLabel()"></bs-alert-close>
    </bs-alert>
    @if (trailing()) { <a href="#after" class="after">after</a> }`,
})
class HostComponent {
  readonly colors = Color;
  readonly announce = signal(false);
  readonly visible = signal(true);
  readonly trailing = signal(true);
  readonly closeLabel = signal('Close');
  readonly events: boolean[] = [];
}

describe('BsAlertComponent behaviour', () => {
  let fixture: ComponentFixture<HostComponent>;
  const q = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement;
  const close = () => q('bs-alert-close button') as HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders the colour class, and role="alert" only when asked to announce', () => {
    expect(q('.alert').classList).toContain('alert-warning');
    expect(q('.alert').hasAttribute('role')).toBe(false);
    fixture.componentInstance.announce.set(true);
    fixture.detectChanges();
    expect(q('.alert').getAttribute('role')).toBe('alert');
  });

  it('the close button is named, translatably, and hides its glyph', () => {
    expect(close().getAttribute('aria-label')).toBe('Close');
    expect(close().querySelector('span')!.getAttribute('aria-hidden')).toBe('true');
    fixture.componentInstance.closeLabel.set('Sluiten');
    fixture.detectChanges();
    expect(close().getAttribute('aria-label')).toBe('Sluiten');
  });

  it('closing moves focus to the next tabbable after the alert', async () => {
    close().focus();
    close().click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.visible()).toBe(false);
    expect(q('.alert')).toBeNull();
    expect(document.activeElement).toBe(q('.after'));
    expect(fixture.componentInstance.events).toContain(false);
  });

  it('at the end of the page, focus falls back to the tabbable before it', () => {
    fixture.componentInstance.trailing.set(false);
    fixture.detectChanges();
    close().focus();
    close().click();
    expect(document.activeElement).toBe(q('.before'));
  });

  it('leaves focus alone when it was not inside the alert', () => {
    q('.before').focus();
    const alert = fixture.debugElement.query(By.directive(BsAlertComponent)).componentInstance as BsAlertComponent;
    alert.rescueFocus();
    expect(document.activeElement).toBe(q('.before'));
  });
});
