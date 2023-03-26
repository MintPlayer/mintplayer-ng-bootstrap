import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { BsDockPanelComponent } from '../dock-panel/dock-panel.component';
import { BsDockComponent } from '../dock/dock.component';

import { BsDockPanelHeaderComponent } from './dock-panel-header.component';

describe('BsDockPanelHeaderComponent', () => {
  let component: BsDockPanelHeaderComponent;
  let fixture: ComponentFixture<BsDockPanelHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsDockPanelHeaderComponent ],
      providers: [
        MockProvider(BsDockComponent),
        MockProvider(BsDockPanelComponent)
      ]
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
