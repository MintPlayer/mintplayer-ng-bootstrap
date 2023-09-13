import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitStringComponent } from './split-string.component';

describe('SplitStringComponent', () => {
  let component: SplitStringComponent;
  let fixture: ComponentFixture<SplitStringComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SplitStringComponent]
    });
    fixture = TestBed.createComponent(SplitStringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
