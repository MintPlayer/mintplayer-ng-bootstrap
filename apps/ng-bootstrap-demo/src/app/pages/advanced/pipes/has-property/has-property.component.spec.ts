import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent, MockModule, MockPipe } from 'ng-mocks';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';
import { BsHasPropertyPipe } from '@mintplayer/ng-bootstrap/has-property';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

import { HasPropertyComponent } from './has-property.component';

describe('HasPropertyComponent', () => {
  let component: HasPropertyComponent;
  let fixture: ComponentFixture<HasPropertyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockPipe(BsHasPropertyPipe),
        MockModule(BsCheckboxModule),
        MockComponent(BsCodeSnippetComponent),
      ],
      declarations: [HasPropertyComponent]
    });
    fixture = TestBed.createComponent(HasPropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
