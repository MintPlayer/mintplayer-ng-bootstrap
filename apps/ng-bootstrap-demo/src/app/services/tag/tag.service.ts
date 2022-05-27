import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PaginationRequest, PaginationResponse } from '@mintplayer/ng-pagination';
import { Tag } from '../../entities/tag';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  constructor(private httpClient: HttpClient) {
  }

  private baseUrl = 'https://mintplayer.com';

  public pageTags(request: PaginationRequest) {
    return this.httpClient.post<PaginationResponse<Tag>>(`${this.baseUrl}/api/v1/Tag/page`, request).toPromise();
  }

  public suggestTags(search: string, includeRelations: boolean = false) {
    return this.httpClient.post<Tag[]>(`${this.baseUrl}/web/v3/Tag/suggest`, {
      searchTerm: search
    }, {
      headers: {
        include_relations: String(includeRelations)
      }
    }).toPromise();
  }

  public searchTags(search: string) {
    return this.httpClient.post<Tag[]>(`${this.baseUrl}/api/v1/Tag/search`, { searchTerm: search }).toPromise();
  }

  public getTags(include_relations: boolean) {
    return this.httpClient.get<Tag[]>(`${this.baseUrl}/api/v1/Tag`, {
      headers: {
        'include_relations': String(include_relations)
      }
    }).toPromise();
  }

  public getTag(id: number, include_relations: boolean) {
    return this.httpClient.get<Tag>(`${this.baseUrl}/api/v1/Tag/${id}`, {
      headers: {
        'include_relations': String(include_relations)
      }
    }).toPromise();
  }

  public createTag(tag: Tag) {
    const clone = this.removeSubjects(tag);
    return this.httpClient.post<Tag>(`${this.baseUrl}/api/v1/Tag`, clone).toPromise();
  }

  public updateTag(tag: Tag) {
    const clone = this.removeSubjects(tag);
    return this.httpClient.put<Tag>(`${this.baseUrl}/api/v1/Tag/${tag.id}`, clone).toPromise();
  }

  private removeSubjects(tag: Tag) {
    // Remove "subjects" from tag
    const clone = Object.assign({}, tag);
    clone.subjects = [];
    if (clone.parent !== null) {
      clone.parent.subjects = [];
    }

    return clone;
  }

  public deleteTag(tag: Tag) {
    return this.httpClient.delete(`${this.baseUrl}/api/v1/Tag/${tag.id}`).toPromise();
  }
}