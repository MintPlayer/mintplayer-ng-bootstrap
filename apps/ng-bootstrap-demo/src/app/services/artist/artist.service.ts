import { Injectable } from '@angular/core';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { Artist } from '../../entities/artist';

@Injectable({
  providedIn: 'root'
})
export class ArtistService {
  private baseUrl = 'https://mintplayer.com';

  public async pageArtists(request: PaginationRequest): Promise<PaginationResponse<Artist> | undefined> {
    const response = await fetch(`${this.baseUrl}/api/v1/artist/page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  }
}
