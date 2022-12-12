import { Directive, Injectable, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSnackbarService } from '@mintplayer/ng-bootstrap/snackbar';
import { BsCopyTestingModule } from '@mintplayer/ng-bootstrap/testing';
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

describe('CopyComponent', () => {
  let component: CopyComponent;
  let fixture: ComponentFixture<CopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsCopyTestingModule
      ],
      declarations: [
        // Unit to test
        CopyComponent,

        // Mock dependencies
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
