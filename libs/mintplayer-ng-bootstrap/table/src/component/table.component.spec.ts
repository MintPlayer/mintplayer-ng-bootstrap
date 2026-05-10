import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsTableComponent } from './table.component';

describe('BsTableComponent', () => {
  let component: BsTableComponent;
  let fixture: ComponentFixture<BsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('omits aria-rowcount on the inner <table> by default', () => {
    const table = fixture.nativeElement.querySelector('table');
    expect(table.hasAttribute('aria-rowcount')).toBe(false);
  });

  it('forwards [ariaRowCount] to the inner <table aria-rowcount=…>', () => {
    fixture.componentRef.setInput('ariaRowCount', 10001);
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table');
    expect(table.getAttribute('aria-rowcount')).toBe('10001');
  });
});
