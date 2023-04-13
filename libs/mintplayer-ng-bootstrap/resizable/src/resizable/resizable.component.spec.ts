import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective, MockProvider } from 'ng-mocks';

import { BsResizableComponent } from './resizable.component';
import { BsResizeGlyphDirective } from '../resize-glyph/resize-glyph.directive';
import { RESIZABLE } from '../providers/resizable.provider';

describe('BsResizableComponent', () => {
  let component: BsResizableComponent;
  let fixture: ComponentFixture<BsResizableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsResizableComponent,
        
        // Mock dependencies
        MockDirective(BsResizeGlyphDirective),
      ],
      providers: [
        MockProvider(RESIZABLE, BsResizableComponent, 'useClass')
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsResizableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
