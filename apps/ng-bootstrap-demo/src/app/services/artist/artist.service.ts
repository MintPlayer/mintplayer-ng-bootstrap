import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { firstValueFrom } from 'rxjs';
import { Artist } from '../../entities/artist';

/** The `GetArtists` query of the MintPlayer Spark app (anonymous, CORS-open). */
const ARTISTS_QUERY_ID = '09111a07-80e4-4df8-8a8a-7c01bfc2441d';

interface SparkQueryResult {
  items: { id: string; breadcrumb: string; values: { key: string; value: unknown }[] }[];
  totalItems: number;
}

@Injectable({ providedIn: 'root' })
export class ArtistService {
  constructor(private httpClient: HttpClient) {}

  private baseUrl = 'https://mintplayer.com';

  public async pageArtists(request: PaginationRequest): Promise<PaginationResponse<Artist>> {
    const result = await firstValueFrom(this.httpClient.post<SparkQueryResult>(`${this.baseUrl}/spark/queries/execute`, {
      queryId: ARTISTS_QUERY_ID,
      skip: (request.page - 1) * request.perPage,
      take: request.perPage,
      sortColumns: request.sortColumns.map((c) => ({
        property: c.property,
        direction: c.direction === 'descending' ? 'desc' : 'asc',
      })),
    }));
    return {
      page: request.page,
      perPage: request.perPage,
      totalRecords: result.totalItems,
      totalPages: Math.ceil(result.totalItems / request.perPage),
      data: result.items.map((item) => {
        const values = Object.fromEntries(item.values.map((v) => [v.key, v.value]));
        return <Artist>{
          // Spark ids are RavenDB document ids ("Artists/146").
          id: Number(item.id.split('/').pop()),
          text: item.breadcrumb,
          name: values['Name'],
          yearStarted: values['YearStarted'],
          yearQuit: values['YearQuit'] ?? null,
          media: [],
          tags: [],
        };
      }),
    };
  }
}
