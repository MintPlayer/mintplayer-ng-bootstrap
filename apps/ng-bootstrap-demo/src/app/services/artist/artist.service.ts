import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaginationRequest, PaginationResponse } from '@mintplayer/ng-pagination';
import { Artist } from '../../entities/artist';

@Injectable({
  providedIn: 'root'
})
export class ArtistService {

  constructor(private httpClient: HttpClient) {
  }

  private baseUrl = 'https://mintplayer.com';

  public pageArtists(request: PaginationRequest) {
    return this.httpClient.post<PaginationResponse<Artist>>(`${this.baseUrl}/api/v1/artist/page`, request).toPromise();
  }
  
}
