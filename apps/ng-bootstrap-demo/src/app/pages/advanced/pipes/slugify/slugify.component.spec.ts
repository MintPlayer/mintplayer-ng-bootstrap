import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule, MockPipe } from 'ng-mocks';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';

import { SlugifyComponent } from './slugify.component';
import { BsSlugifyPipe } from '@mintplayer/ng-bootstrap/slugify';

describe('SlugifyComponent', () => {
  let component: SlugifyComponent;
  let fixture: ComponentFixture<SlugifyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsFormModule),
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
