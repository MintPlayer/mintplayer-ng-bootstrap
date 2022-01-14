import { Directive, Injectable, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSnackbarService } from '@mintplayer/ng-bootstrap';
import { CopyComponent } from './copy.component';

@Injectable({
  providedIn: 'root'
})
class BsSnackbarMockService {
}

@Directive({
  selector: '[highlight]'
})
class HighlightMockDirective {
  @Input() highlight!: string;
}

@Directive({
  selector: '[bsCopy]'
})
class BsCopyMockDirective {
  @Input() bsCopy!: string;
}

describe('CopyComponent', () => {
  let component: CopyComponent;
  let fixture: ComponentFixture<CopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        CopyComponent,

        // Mock dependencies
        BsCopyMockDirective,
        HighlightMockDirective
      ],
      providers: [
        { provide: BsSnackbarService, useClass: BsSnackbarMockService }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CopyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
