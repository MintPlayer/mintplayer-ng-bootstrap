import { Directive, Injectable, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalService } from '@mintplayer/ng-bootstrap';
import { FocusTrapComponent } from './focus-trap.component';

@Injectable({
  providedIn: 'root',
})
class BsModalMockService {
}

@Directive({
  selector: '[bsFor]'
})
class BsForMockDirective {
  @Input() bsFor!: any;
}

describe('FocusTrapComponent', () => {
  let component: FocusTrapComponent;
  let fixture: ComponentFixture<FocusTrapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        FocusTrapComponent,

        // Mock dependencies
        BsForMockDirective
      ],
      providers: [
        { provide: BsModalService, useClass: BsModalMockService }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FocusTrapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
