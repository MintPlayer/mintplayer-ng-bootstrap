import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { Artist } from '../../entities/artist';

@Injectable({
  providedIn: 'root'
})
export class ArtistService {

  private baseUrl = 'https://mintplayer.com';
  httpClient = inject(HttpClient);

  public pageArtists(request: PaginationRequest) {
    return this.httpClient.post<PaginationResponse<Artist>>(`${this.baseUrl}/api/v1/artist/page`, request).toPromise();
  }
  
}
