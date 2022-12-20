import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { MockModule } from 'ng-mocks';

import { DropdownComponent } from './dropdown.component';

describe('DropdownComponent', () => {
  let component: DropdownComponent;
  let fixture: ComponentFixture<DropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsDropdownModule),
      ],
      declarations: [
        // Unit to test
        DropdownComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
