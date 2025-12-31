import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { firstValueFrom } from 'rxjs';
import { Artist } from '../../entities/artist';

@Injectable({
  providedIn: 'root'
})
export class ArtistService {
  private httpClient = inject(HttpClient);
  private baseUrl = 'https://mintplayer.com';

  public pageArtists(request: PaginationRequest): Promise<PaginationResponse<Artist> | undefined> {
    return firstValueFrom(this.httpClient.post<PaginationResponse<Artist>>(`${this.baseUrl}/api/v1/artist/page`, request));
  }
}
