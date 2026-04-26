import { Component, ViewChildren, QueryList } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsPriorityNavItemDirective } from './priority-nav-item.directive';

@Component({
  selector: 'priority-nav-item-test',
  imports: [BsPriorityNavItemDirective],
  template: `
    <a *bsPriorityNavItem="5; hideBelow: 'md'" href="#x">X</a>
    <a *bsPriorityNavItem href="#y">Y</a>
  `,
})
class TestHostComponent {
  @ViewChildren(BsPriorityNavItemDirective) items!: QueryList<BsPriorityNavItemDirective>;
}

describe('BsPriorityNavItemDirective', () => {
  it('captures priority and hideBelow inputs', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const items = fixture.componentInstance.items.toArray();
    expect(items.length).toBe(2);
    expect(items[0].priority).toBe(5);
    expect(items[0].hideBelow).toBe('md');
    expect(items[1].priority).toBeNull();
    expect(items[1].hideBelow).toBeNull();
  });

  it('assigns unique ids', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const items = fixture.componentInstance.items.toArray();
    expect(items[0].id).not.toBe(items[1].id);
  });
});
