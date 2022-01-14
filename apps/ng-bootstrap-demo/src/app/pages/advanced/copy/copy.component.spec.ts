import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSnackbarService } from '@mintplayer/ng-bootstrap';
import { CopyComponent } from './copy.component';

@Injectable({
  providedIn: 'root'
})
class BsSnackbarMockService {
}

describe('CopyComponent', () => {
  let component: CopyComponent;
  let fixture: ComponentFixture<CopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        CopyComponent
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
