import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockPipe, MockComponent, MockDirective } from 'ng-mocks';
import { FormsModule } from '@angular/forms';

import { SlugifyComponent } from './slugify.component';
import { BsSlugifyPipe } from '@mintplayer/ng-bootstrap/slugify';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';

describe('SlugifyComponent', () => {
  let component: SlugifyComponent;
  let fixture: ComponentFixture<SlugifyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockPipe(BsSlugifyPipe),
        SlugifyComponent,
      ]
    });
    fixture = TestBed.createComponent(SlugifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
