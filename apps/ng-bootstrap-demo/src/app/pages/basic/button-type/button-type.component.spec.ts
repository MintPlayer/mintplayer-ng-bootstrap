import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockDirective } from 'ng-mocks';

import { ButtonTypeComponent } from './button-type.component';

describe('ButtonTypeComponent', () => {
  let component: ButtonTypeComponent;
  let fixture: ComponentFixture<ButtonTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsButtonTypeDirective),
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
