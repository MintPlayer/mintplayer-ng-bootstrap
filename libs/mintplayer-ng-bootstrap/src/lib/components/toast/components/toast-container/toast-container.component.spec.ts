import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsToastService } from '../../services/toast/toast.service';
import { BsToastContainerComponent } from './toast-container.component';

@Injectable({
  providedIn: 'root'
})
class BsToastMockService {
}

describe('BsToastContainerComponent', () => {
  let component: BsToastContainerComponent;
  let fixture: ComponentFixture<BsToastContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsToastContainerComponent],
      providers: [{provide: BsToastService, useClass: BsToastMockService}],
    }).compileComponents();

    fixture = TestBed.createComponent(BsToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
