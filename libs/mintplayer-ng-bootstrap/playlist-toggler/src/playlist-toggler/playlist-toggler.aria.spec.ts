import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsPlaylistTogglerComponent } from './playlist-toggler.component';
@Component({
  selector: 'bs-playlist-toggler-harness',
  imports: [BsPlaylistTogglerComponent],
  template: `<bs-playlist-toggler [(state)]="state" [controls]="controls()"></bs-playlist-toggler>`,
})
class HarnessComponent {
  state = signal(false);
  controls = signal<string | null>('playlist');
}

describe('BsPlaylistTogglerComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const button = () => fixture.nativeElement.querySelector<HTMLButtonElement>('button.playlist-toggler')!;

  it('renders a real <button type="button"> with default aria-label', () => {
    expect(button().tagName).toBe('BUTTON');
    expect(button().getAttribute('aria-label')).toBe('Toggle playlist');
  });

  it('aria-expanded mirrors state and aria-controls is forwarded', () => {
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('aria-controls')).toBe('playlist');

    host.state.set(true);
    fixture.detectChanges();
    expect(button().getAttribute('aria-expanded')).toBe('true');
  });
});
