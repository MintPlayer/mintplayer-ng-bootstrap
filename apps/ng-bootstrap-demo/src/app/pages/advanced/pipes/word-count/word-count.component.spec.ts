import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockPipe, MockComponent, MockDirective } from 'ng-mocks';
import { BsWordCountPipe } from '@mintplayer/ng-bootstrap/word-count';

import { WordCountComponent } from './word-count.component';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';

describe('WordCountComponent', () => {
  let component: WordCountComponent;
  let fixture: ComponentFixture<WordCountComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockPipe(BsWordCountPipe),
        WordCountComponent,
      ]
    });
    fixture = TestBed.createComponent(WordCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
