import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSelect2TestingModule } from '@mintplayer/ng-bootstrap/testing';
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

describe('AutofocusComponent', () => {
  let component: AutofocusComponent;
  let fixture: ComponentFixture<AutofocusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsSelect2TestingModule
      ],
      declarations: [
        // Unit to test
        AutofocusComponent,
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
