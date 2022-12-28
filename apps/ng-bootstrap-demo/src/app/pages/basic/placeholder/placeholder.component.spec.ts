import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsPlaceholderModule } from '@mintplayer/ng-bootstrap/placeholder';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { MockModule } from 'ng-mocks';

import { PlaceholderComponent } from './placeholder.component';

describe('PlaceholderComponent', () => {
  let component: PlaceholderComponent;
  let fixture: ComponentFixture<PlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsCardModule),
        MockModule(BsGridModule),
        MockModule(BsToggleButtonModule),
        MockModule(BsPlaceholderModule),
      ],
      declarations: [
        // Unit to test
        PlaceholderComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
