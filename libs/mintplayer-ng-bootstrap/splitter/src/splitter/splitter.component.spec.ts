import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsSplitterComponent } from './splitter.component';

describe('BsSplitterComponent', () => {
  let component: BsSplitterComponent;
  let fixture: ComponentFixture<BsSplitterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsSplitterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsSplitterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
