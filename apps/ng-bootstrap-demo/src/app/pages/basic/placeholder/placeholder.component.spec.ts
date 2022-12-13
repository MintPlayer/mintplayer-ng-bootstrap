import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsCardTestingModule, BsGridTestingModule, BsPlaceholderTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { PlaceholderComponent } from './placeholder.component';

describe('PlaceholderComponent', () => {
  let component: PlaceholderComponent;
  let fixture: ComponentFixture<PlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        BsCardTestingModule,
        BsGridTestingModule,
        BsPlaceholderTestingModule,
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
