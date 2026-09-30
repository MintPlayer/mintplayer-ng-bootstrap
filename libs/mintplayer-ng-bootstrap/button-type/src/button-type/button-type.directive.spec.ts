import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from './button-type.directive';

@Component({
  selector: 'test-host',
  imports: [BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="own" [color]="color()">Test</button>
    <a href="#x" [color]="colors.secondary">Link</a>
    <button class="plain">Plain</button>`,
})
class TestHostComponent {
  readonly colors = Color;
  readonly color = signal<Color | undefined>(Color.primary);
}

describe('BsButtonTypeDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  const button = () => fixture.nativeElement.querySelector('button.own') as HTMLButtonElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('styles a coloured button, keeping its own classes', () => {
    expect(button().classList).toContain('btn');
    expect(button().classList).toContain('btn-primary');
    expect(button().classList).toContain('own');
  });

  it('also applies to links', () => {
    const link = fixture.nativeElement.querySelector('a') as HTMLElement;
    expect(link.classList).toContain('btn');
    expect(link.classList).toContain('btn-secondary');
  });

  it('follows a colour change on the next render', () => {
    fixture.componentInstance.color.set(Color.danger);
    fixture.detectChanges();
    expect(button().classList).toContain('btn-danger');
    expect(button().classList).not.toContain('btn-primary');
  });

  it('is transparent without a colour', () => {
    fixture.componentInstance.color.set(undefined);
    fixture.detectChanges();
    expect(button().classList).toContain('btn-transparent');
  });

  it('leaves a button without [color] alone', () => {
    expect((fixture.nativeElement.querySelector('button.plain') as HTMLElement).className).toBe('plain');
  });
});
