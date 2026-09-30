import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bsFormatBytes',
  pure: true,
})
export class BsFormatBytesPipe implements PipeTransform {

  transform(value: number, decimals = 2) {
    if (value === 0) {
      return "0 Bytes";
    }

    const k = 1024;
    const dm = decimals <= 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    // Clamped: below 1 byte the log is negative, and past the last unit there is no name.
    const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(value) / Math.log(k))));

    return parseFloat((value / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

}
