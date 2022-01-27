import { HttpClientModule } from '@angular/common/http';
import { Component, Injectable, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';

import { Select2Component } from './select2.component';

@Injectable({
  providedIn: 'root'
})
class SubjectMockService {
}

@Injectable({
  providedIn: 'root'
})
class TagMockService {
}

@Component({
  selector: 'bs-select2',
  template: `
    <div>
      Select2 works
    </div>`
})
class BsSelect2MockComponent {
  @Input() suggestions: any[] = [];
  @Input() selectedItems: any[] = [];
}

describe('Select2Component', () => {
  let component: Select2Component;
  let fixture: ComponentFixture<Select2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule
      ],
      declarations: [
        // Unit to test
        Select2Component,

        // Mock dependencies
        BsSelect2MockComponent
      ],
      providers: [
        { provide: SubjectService, useClass: SubjectMockService },
        { provide: TagService, useClass: TagMockService }
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
