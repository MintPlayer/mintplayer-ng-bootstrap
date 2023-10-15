import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockModule } from 'ng-mocks';
import { BsHasPropertyModule } from '@mintplayer/ng-bootstrap/has-property';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { HasPropertyComponent } from './has-property.component';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';

describe('HasPropertyComponent', () => {
  let component: HasPropertyComponent;
  let fixture: ComponentFixture<HasPropertyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsHasPropertyModule),
        MockModule(BsToggleButtonModule),
        MockModule(BsCodeSnippetModule),
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
