declare module 'pngjs' {
  import { EventEmitter } from 'events';

  export interface PNGOptions {
    width?: number;
    height?: number;
    filterType?: number;
    colorType?: number;
    inputHasAlpha?: boolean;
    bgColor?: { red: number; green: number; blue: number; alpha?: number };
    bitDepth?: number;
    deflateLevel?: number;
    deflateStrategy?: number;
    fill?: boolean;
  }

  export class PNG extends EventEmitter {
    constructor(options?: PNGOptions);
    data: Buffer;
    width: number;
    height: number;
    pack(): NodeJS.ReadableStream;
    on(event: 'error', listener: (err: any) => void): this;
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
  }
}
