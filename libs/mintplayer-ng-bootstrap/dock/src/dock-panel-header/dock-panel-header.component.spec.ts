import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDockPanelHeaderComponent } from './dock-panel-header.component';

describe('BsDockPanelHeaderComponent', () => {
  let component: BsDockPanelHeaderComponent;
  let fixture: ComponentFixture<BsDockPanelHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsDockPanelHeaderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsDockPanelHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
