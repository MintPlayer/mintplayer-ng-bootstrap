import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';

import { SlugifyComponent } from './slugify.component';
import { BsSlugifyModule } from '@mintplayer/ng-bootstrap/slugify';

describe('SlugifyComponent', () => {
  let component: SlugifyComponent;
  let fixture: ComponentFixture<SlugifyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SlugifyComponent],
      imports: [
        FormsModule,
        MockModule(BsFormModule),
        MockModule(BsSlugifyModule),
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
