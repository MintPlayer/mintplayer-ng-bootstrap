import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { MockModule } from 'ng-mocks';

import { ButtonTypeComponent } from './button-type.component';

describe('ButtonTypeComponent', () => {
  let component: ButtonTypeComponent;
  let fixture: ComponentFixture<ButtonTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsButtonTypeModule)
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
