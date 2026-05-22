import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BsModalHostComponent } from '../modal-host/modal-host.component';
import { BsModalDirective } from '../../directives/modal/modal.directive';
import { BsModalHeaderDirective } from '../../directives/modal-header/modal-header.directive';
import { BsModalBodyDirective } from '../../directives/modal-body/modal-body.directive';
@Component({
  selector: 'bs-modal-aria-harness',
  imports: [BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective],
  template: `
    <button type="button" data-testid="trigger">Open</button>
    <bs-modal [(isOpen)]="isOpen">
      <ng-template bsModal>
        <div bsModalHeader>My modal title</div>
        <div bsModalBody>My modal description</div>
      </ng-template>
    </bs-modal>
  `,
})
class HarnessComponent {
  isOpen = signal(false);
}

describe('BsModalComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;
  let appRef: ApplicationRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [A11yModule, OverlayModule, HarnessComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    appRef = TestBed.inject(ApplicationRef);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    host.isOpen.set(false);
    fixture.detectChanges();
    fixture.nativeElement.remove();
  });

  const dialog = () => document.querySelector<HTMLElement>('.cdk-overlay-container .modal[role="dialog"]');
  const flushRender = () => {
    appRef.tick();
    fixture.detectChanges();
  };

  it('renders no dialog while closed', () => {
    expect(dialog()).toBeNull();
  });

  it('dialog has role=dialog, aria-modal=true, tabindex=-1', () => {
    host.isOpen.set(true);
    flushRender();

    const d = dialog()!;
    expect(d.getAttribute('role')).toBe('dialog');
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('tabindex')).toBe('-1');
  });

  it('aria-labelledby points at the bsModalHeader id, aria-describedby at bsModalBody', () => {
    host.isOpen.set(true);
    flushRender();
    flushRender(); // afterNextRender → service signal → CD propagation

    const d = dialog()!;
    const header = d.querySelector<HTMLElement>('.modal-header')!;
    const body = d.querySelector<HTMLElement>('.modal-body')!;
    expect(header.id).toMatch(/^bs-modal-header-\d+$/);
    expect(body.id).toMatch(/^bs-modal-body-\d+$/);
    expect(d.getAttribute('aria-labelledby')).toBe(header.id);
    expect(d.getAttribute('aria-describedby')).toBe(body.id);
  });
});
