import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockModule, MockPipe } from 'ng-mocks';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsWordCountPipe } from '@mintplayer/ng-bootstrap/word-count';

import { WordCountComponent } from './word-count.component';

describe('WordCountComponent', () => {
  let component: WordCountComponent;
  let fixture: ComponentFixture<WordCountComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WordCountComponent],
      imports: [
        FormsModule,
        MockModule(BsFormModule),
        MockPipe(BsWordCountPipe),
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
