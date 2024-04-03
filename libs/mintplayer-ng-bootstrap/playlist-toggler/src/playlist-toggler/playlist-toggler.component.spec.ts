import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsPlaylistTogglerComponent } from './playlist-toggler.component';

describe('BsNavbarTogglerComponent', () => {
  let component: BsPlaylistTogglerComponent;
  let fixture: ComponentFixture<BsPlaylistTogglerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BsPlaylistTogglerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsPlaylistTogglerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
