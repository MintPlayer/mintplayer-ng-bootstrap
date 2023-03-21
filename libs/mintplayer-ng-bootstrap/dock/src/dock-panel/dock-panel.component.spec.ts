import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDockPanelComponent } from './dock-panel.component';

describe('BsDockPanelComponent', () => {
  let component: BsDockPanelComponent;
  let fixture: ComponentFixture<BsDockPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsDockPanelComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsDockPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
