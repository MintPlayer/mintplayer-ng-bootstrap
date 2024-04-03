import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { MockModule, MockProvider } from 'ng-mocks';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';

import { Select2Component } from './select2.component';

describe('Select2Component', () => {
  let component: Select2Component;
  let fixture: ComponentFixture<Select2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        MockModule(BsSelect2Module),
      ],
      declarations: [
        // Unit to test
        Select2Component,
      ],
      providers: [
        MockProvider(SubjectService),
        MockProvider(TagService),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Select2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
