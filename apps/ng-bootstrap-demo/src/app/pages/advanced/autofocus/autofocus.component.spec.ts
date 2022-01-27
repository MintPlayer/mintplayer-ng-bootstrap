import { Component, EventEmitter, Injectable, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';
import { AutofocusComponent } from './autofocus.component';

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
  template: 'select2'
})
class BsSelect2MockComponent {
  @Input() public selectedItems: any[] = [];
  @Input() public suggestions: any[] = [];
  @Output() public provideSuggestions = new EventEmitter<string>();
}

describe('AutofocusComponent', () => {
  let component: AutofocusComponent;
  let fixture: ComponentFixture<AutofocusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Unit to test
        AutofocusComponent,

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
    fixture = TestBed.createComponent(AutofocusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
