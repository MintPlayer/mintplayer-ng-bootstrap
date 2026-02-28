import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent, MockDirective } from 'ng-mocks';

import { JsonPipe } from '@angular/common';
import { SelectComponent } from './select.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsSelectComponent, BsSelectValueAccessor, BsSelectOption } from '@mintplayer/ng-bootstrap/select';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsGridColDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsSelectComponent), MockDirective(BsSelectValueAccessor), MockDirective(BsSelectOption),
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonValueAccessor), MockDirective(BsToggleButtonGroupDirective),
        JsonPipe,
        SelectComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
