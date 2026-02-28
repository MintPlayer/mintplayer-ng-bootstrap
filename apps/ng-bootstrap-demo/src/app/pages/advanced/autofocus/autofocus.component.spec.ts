import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProviders, MockComponent, MockDirective } from 'ng-mocks';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';
import { AutofocusComponent } from './autofocus.component';
import { BsSelect2Component, BsItemTemplateDirective, BsSuggestionTemplateDirective } from '@mintplayer/ng-bootstrap/select2';

describe('AutofocusComponent', () => {
  let component: AutofocusComponent;
  let fixture: ComponentFixture<AutofocusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsSelect2Component), MockDirective(BsItemTemplateDirective), MockDirective(BsSuggestionTemplateDirective),
        AutofocusComponent,
      ],
      providers: [
        ...MockProviders(SubjectService, TagService),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AutofocusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
