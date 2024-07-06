import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { MockComponent, MockModule } from 'ng-mocks';

import { SelectComponent } from './select.component';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsGridModule),
        MockModule(BsSelectModule),
        MockModule(BsCheckboxModule),
      ],
      declarations: [
        // Unit to test
        SelectComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
