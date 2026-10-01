import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';
import { FileUpload } from '../file-upload';
import { MockDirective, MockPipe, MockComponent } from 'ng-mocks';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormatBytesPipe } from '../pipes/format-bytes/format-bytes.pipe';
import { BsFileUploadComponent } from './file-upload.component';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsProgressComponent, BsProgressBarComponent } from '@mintplayer/ng-bootstrap/progress-bar';

describe('BsFileUploadComponent', () => {
  let component: BsFileUploadComponent;
  let fixture: ComponentFixture<BsFileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsForDirective),
        MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
        MockComponent(BsProgressComponent), MockComponent(BsProgressBarComponent),
        // Unit to test
        BsFileUploadComponent,

        // Mock dependencies
        MockPipe(BsFormatBytesPipe),
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsFileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  imports: [BsFileUploadComponent],
  template: `
    <bs-file-upload [(files)]="files" (filesDropped)="dropped.push($event)"
      [fileAddedAnnouncement]="added()" [filesAddedAnnouncement]="addedMany()" [progressLabel]="progress()">
    </bs-file-upload>`,
})
class HostComponent {
  readonly files = signal<FileUpload[]>([]);
  readonly dropped: FileUpload[][] = [];
  readonly added = signal((name: string) => `Added ${name}`);
  readonly addedMany = signal((count: number) => `Added ${count} files`);
  readonly progress = signal((name: string) => `Upload progress for ${name}`);
}

const fileList = (...files: File[]) =>
  ({ length: files.length, item: (i: number) => files[i] ?? null }) as unknown as FileList;

describe('BsFileUploadComponent behaviour', () => {
  let fixture: ComponentFixture<HostComponent>;
  let announce: ReturnType<typeof vi.fn>;
  const zone = () => fixture.nativeElement.querySelector('bs-file-upload') as HTMLElement;
  const input = () => fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
  const drag = (type: string, files?: FileList) => {
    const ev = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
      dataTransfer: files === undefined ? null : { files, effectAllowed: 'all' },
    });
    zone().dispatchEvent(ev);
    fixture.detectChanges();
    return ev as Event & { dataTransfer: { effectAllowed: string } | null };
  };
  const choose = (files: FileList | null) => {
    Object.defineProperty(input(), 'files', { configurable: true, value: files });
    input().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    announce = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({ providers: [{ provide: BsLiveAnnouncerService, useValue: { announce } }] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('adds files chosen through the input, indexed after the existing ones, and announces one by name', () => {
    choose(fileList(new File(['abc'], 'a.txt')));
    expect(fixture.componentInstance.files().map((f) => [f.file.name, f.index, f.progress])).toEqual([['a.txt', 0, 0]]);
    expect(announce).toHaveBeenCalledWith('Added a.txt');
    choose(fileList(new File(['1'], 'b.txt'), new File(['2'], 'c.txt')));
    expect(fixture.componentInstance.files().map((f) => f.index)).toEqual([0, 1, 2]);
    expect(announce).toHaveBeenLastCalledWith('Added 2 files');
    expect(fixture.componentInstance.dropped.map((batch) => batch.length)).toEqual([1, 2]);
  });

  it('ignores a change with no file list, and announces nothing for an empty one', () => {
    choose(null);
    choose(fileList());
    expect(fixture.componentInstance.files()).toEqual([]);
    expect(announce).not.toHaveBeenCalled();
  });

  it('highlights while a file is dragged over, and drops it', () => {
    const over = drag('dragover', fileList());
    expect(over.defaultPrevented).toBe(true);
    expect(over.dataTransfer!.effectAllowed).toBe('copy');
    expect(fixture.nativeElement.querySelector('.dropzone').classList).toContain('dragging');
    drag('drop', fileList(new File(['x'], 'd.txt')));
    expect(fixture.nativeElement.querySelector('.dropzone').classList).not.toContain('dragging');
    expect(fixture.componentInstance.files().map((f) => f.file.name)).toEqual(['d.txt']);
  });

  it('a drag leaving clears the highlight; a drag without data does not highlight', () => {
    drag('dragover');
    expect(fixture.nativeElement.querySelector('.dropzone').classList).not.toContain('dragging');
    drag('dragover', fileList());
    drag('dragleave');
    expect(fixture.nativeElement.querySelector('.dropzone').classList).not.toContain('dragging');
    drag('drop');
    expect(fixture.componentInstance.files()).toEqual([]);
  });

  it('lists each file with its size and a named progress bar', () => {
    choose(fileList(new File(['x'.repeat(2048)], 'e.txt')));
    const item = fixture.nativeElement.querySelector('bs-list-group-item') as HTMLElement;
    expect(item.textContent).toContain('e.txt');
    expect(item.textContent).toContain('2 KB');
    expect(item.querySelector('[aria-label="Upload progress for e.txt"]')).not.toBeNull();
  });

  it('announces and labels in the consumer\'s language', () => {
    fixture.componentInstance.added.set((name) => `${name} toegevoegd`);
    fixture.componentInstance.addedMany.set((n) => `${n} bestanden toegevoegd`);
    fixture.componentInstance.progress.set((name) => `Voortgang van ${name}`);
    fixture.detectChanges();
    choose(fileList(new File(['1'], 'f.txt')));
    expect(announce).toHaveBeenLastCalledWith('f.txt toegevoegd');
    choose(fileList(new File(['1'], 'g.txt'), new File(['2'], 'h.txt')));
    expect(announce).toHaveBeenLastCalledWith('2 bestanden toegevoegd');
    expect(fixture.nativeElement.querySelector('[aria-label="Voortgang van f.txt"]')).not.toBeNull();
  });
});
