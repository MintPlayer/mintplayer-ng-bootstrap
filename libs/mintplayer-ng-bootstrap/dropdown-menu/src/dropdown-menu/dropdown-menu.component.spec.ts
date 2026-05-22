import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDropdownMenuComponent } from './dropdown-menu.component';

describe('BsDropdownMenuComponent', () => {
  let component: BsDropdownMenuComponent;
  let fixture: ComponentFixture<BsDropdownMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsDropdownMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsDropdownMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
