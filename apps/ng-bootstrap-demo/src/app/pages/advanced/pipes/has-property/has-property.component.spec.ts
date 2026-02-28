import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent, MockPipe, MockDirective } from 'ng-mocks';
import { BsHasPropertyPipe } from '@mintplayer/ng-bootstrap/has-property';

import { HasPropertyComponent } from './has-property.component';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';

describe('HasPropertyComponent', () => {
  let component: HasPropertyComponent;
  let fixture: ComponentFixture<HasPropertyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockPipe(BsHasPropertyPipe),
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonGroupDirective),
        MockComponent(BsCodeSnippetComponent),
        HasPropertyComponent,
      ]
    });
    fixture = TestBed.createComponent(HasPropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
