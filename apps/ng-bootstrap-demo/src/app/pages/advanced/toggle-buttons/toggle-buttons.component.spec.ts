import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToggleButtonsComponent } from './toggle-buttons.component';
import { MockComponent } from 'ng-mocks';
import { BsNavbarTogglerComponent } from '@mintplayer/ng-bootstrap/navbar-toggler';
import { BsPlaylistTogglerComponent } from '@mintplayer/ng-bootstrap/playlist-toggler';

describe('ToggleButtonsComponent', () => {
  let component: ToggleButtonsComponent;
  let fixture: ComponentFixture<ToggleButtonsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        MockComponent(BsNavbarTogglerComponent),
        MockComponent(BsPlaylistTogglerComponent),
        ToggleButtonsComponent
      ]
    });
    fixture = TestBed.createComponent(ToggleButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
