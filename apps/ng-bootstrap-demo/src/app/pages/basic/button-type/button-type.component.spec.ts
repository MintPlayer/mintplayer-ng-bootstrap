import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { MockModule } from 'ng-mocks';

import { ButtonTypeComponent } from './button-type.component';

describe('ButtonTypeComponent', () => {
  let component: ButtonTypeComponent;
  let fixture: ComponentFixture<ButtonTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsButtonTypeModule),
        MockModule(BsTrackByModule),
      ],
      declarations: [ ButtonTypeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
