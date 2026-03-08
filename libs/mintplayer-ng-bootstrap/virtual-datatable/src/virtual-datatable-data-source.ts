import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, Observable, Subscription, from, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

export class VirtualDatatableDataSource<T> extends DataSource<T> {
  private readonly fetchFn: (skip: number, take: number) => Promise<{ data: T[]; totalRecords: number }>;
  private readonly pageSize: number;
  private readonly cachedPages = new Map<number, T[]>();
  private totalRecords = 0;
  private readonly dataStream = new BehaviorSubject<T[]>([]);
  private subscription?: Subscription;

  constructor(
    fetchFn: (skip: number, take: number) => Promise<{ data: T[]; totalRecords: number }>,
    pageSize = 50
  ) {
    super();
    this.fetchFn = fetchFn;
    this.pageSize = pageSize;
  }

  connect(collectionViewer: CollectionViewer): Observable<T[]> {
    this.subscription = collectionViewer.viewChange.pipe(
      map(range => this.getPageIndices(range)),
      distinctUntilChanged((a, b) => a.join() === b.join()),
      switchMap(pages => from(this.fetchPages(pages)).pipe(
        catchError(() => of(this.dataStream.value))
      ))
    ).subscribe(data => this.dataStream.next(data));

    return this.dataStream;
  }

  disconnect(): void {
    this.subscription?.unsubscribe();
    this.dataStream.complete();
  }

  get length(): number {
    return this.totalRecords;
  }

  reset(): void {
    this.cachedPages.clear();
    this.totalRecords = 0;
    this.dataStream.next([]);
  }

  private getPageIndices(range: { start: number; end: number }): number[] {
    const startPage = Math.floor(range.start / this.pageSize);
    const endPage = Math.floor((range.end - 1) / this.pageSize);
    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  private async fetchPages(pageIndices: number[]): Promise<T[]> {
    const uncachedPages = pageIndices.filter(p => !this.cachedPages.has(p));

    const results = await Promise.all(
      uncachedPages.map(async pageIndex => {
        const skip = pageIndex * this.pageSize;
        const result = await this.fetchFn(skip, this.pageSize);
        return { pageIndex, result };
      })
    );

    for (const { pageIndex, result } of results) {
      this.cachedPages.set(pageIndex, result.data);
    }
    if (results.length > 0) {
      this.totalRecords = results[0].result.totalRecords;
    }

    // Build the full data array with placeholders for unloaded pages
    const totalPages = Math.ceil(this.totalRecords / this.pageSize);
    const data: T[] = [];
    for (let i = 0; i < totalPages; i++) {
      const page = this.cachedPages.get(i);
      if (page) {
        data.push(...page);
      } else {
        // Fill with empty slots to maintain correct virtual scroll positioning
        const remaining = Math.min(this.pageSize, this.totalRecords - i * this.pageSize);
        data.push(...new Array<T>(remaining));
      }
    }
    return data;
  }
}
