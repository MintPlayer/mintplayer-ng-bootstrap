import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';
import { MockModule } from 'ng-mocks';

import { InputGroupComponent } from './input-group.component';

describe('InputGroupComponent', () => {
  let component: InputGroupComponent;
  let fixture: ComponentFixture<InputGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsButtonTypeModule),
        MockModule(BsInputGroupModule),  
      ],
      declarations: [ InputGroupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
