import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsDockManagerComponent } from './dock-manager.component';
import { BsDockPaneComponent } from './dock-pane.component';

@Component({
  selector: 'dock-pane-unnamed-test',
  template: `<bs-dock-manager><bs-dock-pane [name]="name()">x</bs-dock-pane></bs-dock-manager>`,
  imports: [BsDockManagerComponent, BsDockPaneComponent],
})
class UnnamedPaneTestComponent {
  readonly name = signal('');
}

describe('BsDockPaneComponent', () => {
  it('refuses to render without a name, since the name is its slot', async () => {
    await TestBed.configureTestingModule({ imports: [UnnamedPaneTestComponent] }).compileComponents();
    const fixture = TestBed.createComponent(UnnamedPaneTestComponent);
    expect(() => fixture.detectChanges()).toThrow('bs-dock-pane requires a unique "name" input.');
  });
});
