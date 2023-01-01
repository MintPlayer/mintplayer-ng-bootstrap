import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsMarkdownModule } from '@mintplayer/ng-bootstrap/markdown';
import { MockModule } from 'ng-mocks';

import { MarkdownComponent } from './markdown.component';

describe('MarkdownComponent', () => {
  let component: MarkdownComponent;
  let fixture: ComponentFixture<MarkdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsFormModule),
        MockModule(BsGridModule),
        MockModule(BsMarkdownModule),
      ],
      declarations: [
        // Unit to test
        MarkdownComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarkdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
