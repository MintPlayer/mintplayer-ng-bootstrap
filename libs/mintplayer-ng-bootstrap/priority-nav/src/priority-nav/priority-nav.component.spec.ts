import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { BsPriorityNavComponent } from './priority-nav.component';
import { BsPriorityNavItemDirective } from '../priority-nav-item/priority-nav-item.directive';

@Component({
  selector: 'priority-nav-test',
  imports: [BsPriorityNavComponent, BsPriorityNavItemDirective],
  template: `
    <bs-priority-nav>
      <a *bsPriorityNavItem="1; hideBelow: 'md'" href="#a">A</a>
      <a *bsPriorityNavItem="2; hideBelow: 'lg'" href="#b">B</a>
      <a *bsPriorityNavItem="3" href="#c">C</a>
    </bs-priority-nav>
  `,
})
class TestHostComponent {}

describe('BsPriorityNavComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render all items in the inline strip', () => {
    const links = fixture.nativeElement.querySelectorAll('.priority-nav-strip .priority-nav-item');
    expect(links.length).toBe(3);
  });

  it('should also render items in the overflow menu (dual render)', () => {
    const overflowItems = fixture.nativeElement.querySelectorAll('.priority-nav-overflow .priority-nav-overflow-item');
    expect(overflowItems.length).toBe(3);
  });
});
