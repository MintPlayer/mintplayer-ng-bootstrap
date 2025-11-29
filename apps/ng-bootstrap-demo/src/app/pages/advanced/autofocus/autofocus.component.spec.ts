import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { MockModule, MockProviders } from 'ng-mocks';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';
import { AutofocusComponent } from './autofocus.component';

describe('AutofocusComponent', () => {
  let component: AutofocusComponent;
  let fixture: ComponentFixture<AutofocusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsSelect2Module),
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
