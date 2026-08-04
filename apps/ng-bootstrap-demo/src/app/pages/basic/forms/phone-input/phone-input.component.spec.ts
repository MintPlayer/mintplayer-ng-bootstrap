import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent, MockDirective } from 'ng-mocks';
import { JsonPipe } from '@angular/common';
import { PhoneInputComponent } from './phone-input.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsPhoneInputComponent } from '@mintplayer/ng-bootstrap/phone-input';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

describe('PhoneInputComponent', () => {
  let component: PhoneInputComponent;
  let fixture: ComponentFixture<PhoneInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsGridComponent),
        MockDirective(BsGridRowDirective),
        MockDirective(BsGridColumnDirective),
        MockDirective(BsGridColDirective),
        MockComponent(BsFormComponent),
        MockComponent(BsInputGroupComponent),
        MockComponent(BsPhoneInputComponent),
        MockComponent(BsSelectComponent),
        MockComponent(BsCheckboxComponent),
        MockComponent(BsCodeSnippetComponent),
        JsonPipe,
        PhoneInputComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhoneInputComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
