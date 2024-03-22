import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToggleButtonsComponent } from './toggle-buttons.component';
import { MockModule } from 'ng-mocks';
import { BsPlaylistTogglerModule } from '@mintplayer/ng-bootstrap/playlist-toggler';
import { BsNavbarTogglerModule } from '@mintplayer/ng-bootstrap/navbar-toggler';

describe('ToggleButtonsComponent', () => {
  let component: ToggleButtonsComponent;
  let fixture: ComponentFixture<ToggleButtonsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MockModule(BsNavbarTogglerModule),
        MockModule(BsPlaylistTogglerModule)
      ],
      declarations: [ToggleButtonsComponent]
    });
    fixture = TestBed.createComponent(ToggleButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
