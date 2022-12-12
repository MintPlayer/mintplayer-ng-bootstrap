import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule, BsModalTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { TagService } from '../../../services/tag/tag.service';
import { ModalComponent } from './modal.component';

@Injectable({
  providedIn: 'root'
})
class TagMockService {
}

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
        BsModalTestingModule,
      ],
      declarations: [
        // Unit to test
        ModalComponent,
      ],
      providers: [
        { provide: 'GIT_REPO', useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/apps/ng-bootstrap-demo/src/app/' },
        { provide: TagService, useClass: TagMockService }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
