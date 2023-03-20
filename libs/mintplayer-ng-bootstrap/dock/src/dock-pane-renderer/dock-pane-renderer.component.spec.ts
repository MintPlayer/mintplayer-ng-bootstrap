import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDockPaneRendererComponent } from './dock-pane-renderer.component';

describe('BsDockPaneRendererComponent', () => {
  let component: BsDockPaneRendererComponent;
  let fixture: ComponentFixture<BsDockPaneRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsDockPaneRendererComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsDockPaneRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
