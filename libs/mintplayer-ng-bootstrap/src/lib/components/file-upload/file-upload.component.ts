import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'bs-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class BsFileUploadComponent implements OnInit {

  constructor() { }
  
  @Input() public dropFilesCaption = 'Drop your files here';
  @Input() public browseFilesCaption = 'Browse for files';
  @Input() public placeholder = 'Drop files to upload';

  ngOnInit(): void {
  }

  fileAddedRemoved(event: Event) {
    
  }

}
