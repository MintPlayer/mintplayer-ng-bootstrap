import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsLinifyPipe } from '@mintplayer/ng-bootstrap/linify';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockDirective, MockPipe, MockComponent } from 'ng-mocks';

import { LinifyComponent } from './linify.component';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';

describe('LinifyComponent', () => {
  let component: LinifyComponent;
  let fixture: ComponentFixture<LinifyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockPipe(BsLinifyPipe),
        MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonGroupDirective),

        // Unit to test (standalone)
        LinifyComponent,
      ]
    });
    fixture = TestBed.createComponent(LinifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
