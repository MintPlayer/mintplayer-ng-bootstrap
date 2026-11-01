import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsListGroupComponent } from './list-group.component';

@Component({
  imports: [BsListGroupComponent],
  template: `<bs-list-group [flush]="flush()"></bs-list-group>`,
})
class FlushHostComponent {
  readonly flush = signal(false);
}

describe('BsListGroupComponent', () => {
  let component: BsListGroupComponent;
  let fixture: ComponentFixture<BsListGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BsListGroupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsListGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('the host is the .list-group, with .list-group-flush only while [flush] is set', () => {
    const host = TestBed.createComponent(FlushHostComponent);
    host.detectChanges();
    const list: HTMLElement = host.nativeElement.querySelector('bs-list-group');
    expect(list.classList).toContain('list-group');
    expect(list.classList).not.toContain('list-group-flush');

    host.componentInstance.flush.set(true);
    host.detectChanges();
    expect(list.classList).toContain('list-group-flush');

    host.componentInstance.flush.set(false);
    host.detectChanges();
    expect(list.classList).not.toContain('list-group-flush');
  });
});
