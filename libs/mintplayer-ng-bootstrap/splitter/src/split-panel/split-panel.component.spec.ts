import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsSplitPanelComponent } from './split-panel.component';

describe('BsSplitPanelComponent', () => {
  let component: BsSplitPanelComponent;
  let fixture: ComponentFixture<BsSplitPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsSplitPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsSplitPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
