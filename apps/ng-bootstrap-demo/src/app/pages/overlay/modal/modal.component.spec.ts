import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockDirective, MockProvider, MockComponent } from 'ng-mocks';
import { GIT_REPO } from '../../../providers/git-repo.provider';
import { TagService } from '../../../services/tag/tag.service';
import { ModalComponent } from './modal.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsModalComponent, BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective } from '@mintplayer/ng-bootstrap/modal';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsModalComponent), MockComponent(BsModalHostComponent), MockDirective(BsModalDirective), MockDirective(BsModalHeaderDirective), MockDirective(BsModalBodyDirective), MockDirective(BsModalFooterDirective), MockDirective(BsModalCloseDirective),
        MockDirective(BsButtonTypeDirective),

        // Unit to test (standalone)
        ModalComponent,
      ],
      providers: [
        { provide: GIT_REPO, useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/apps/ng-bootstrap-demo/src/app/' },
        MockProvider(TagService),
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
