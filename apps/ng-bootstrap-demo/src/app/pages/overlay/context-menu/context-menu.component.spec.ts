import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { MockComponent } from 'ng-mocks';

import { ContextMenuComponent } from './context-menu.component';

describe('ContextMenuComponent', () => {
  let component: ContextMenuComponent;
  let fixture: ComponentFixture<ContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsHasOverlayComponent),
      ],
      declarations: [ ContextMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
