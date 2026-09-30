import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DropdownSelectEventDetail } from '@mintplayer/web-components/dropdown-menu';
import { BsDropdownMenuComponent } from '../dropdown-menu/dropdown-menu.component';
import { BsDropdownItemDirective } from './dropdown-item.directive';
// Register <mp-dropdown-menu> eagerly: the wrapper only imports it after render,
// and the value only reaches the select event once the menu handles the click.
import '@mintplayer/web-components/dropdown-menu';

@Component({
  selector: 'bs-dropdown-item-value-test',
  imports: [BsDropdownMenuComponent, BsDropdownItemDirective],
  template: `
    <bs-dropdown-menu (select)="picked.push($event.value)">
      <li bsDropdownItem [value]="value()">A</li>
    </bs-dropdown-menu>
  `,
})
class HostComponent {
  readonly value = signal<unknown>(undefined);
  readonly picked: DropdownSelectEventDetail['value'][] = [];
}

/**
 * `[bsDropdownItem]`'s opaque `value` must reach the menu's `select` event
 * unchanged. It used to be written to the `<li>`'s `value` property, which
 * `HTMLLIElement` owns as a native long: an object or a string became 0.
 */
describe('BsDropdownItemDirective value', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  const li = () => fixture.nativeElement.querySelector('li.dropdown-item') as HTMLLIElement;

  async function select(value: unknown): Promise<unknown> {
    host.value.set(value);
    fixture.detectChanges();
    await fixture.whenStable();
    li().click();
    return host.picked.at(-1);
  }

  it('carries an object value to the select event unchanged', async () => {
    const value = { id: 7 };
    expect(await select(value)).toBe(value);
  });

  it('carries a string value to the select event unchanged', async () => {
    expect(await select('two')).toBe('two');
  });

  it('carries an integer value to the select event', async () => {
    expect(await select(7)).toBe(7);
  });

  it('follows a value change', async () => {
    await select('first');
    expect(await select({ id: 2 })).toEqual({ id: 2 });
    expect(host.picked).toEqual(['first', { id: 2 }]);
  });

  it('leaves the li native value untouched, so no value="0" attribute appears', async () => {
    await select('two');
    expect(li().hasAttribute('value')).toBe(false);
  });
});
