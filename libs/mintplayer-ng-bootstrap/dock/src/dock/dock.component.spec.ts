import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsDockPaneRendererComponent } from '../dock-pane-renderer/dock-pane-renderer.component';

import { BsDockComponent } from './dock.component';

describe('BsDockComponent', () => {
  let component: BsDockComponent;
  let fixture: ComponentFixture<BsDockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsDockComponent,
      
        // Mock dependencies
        MockComponent(BsDockPaneRendererComponent)
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsDockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
