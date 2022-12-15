import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeTestingModule, BsInputGroupTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { InputGroupComponent } from './input-group.component';

describe('InputGroupComponent', () => {
  let component: InputGroupComponent;
  let fixture: ComponentFixture<InputGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsButtonTypeTestingModule,
        BsInputGroupTestingModule  
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
