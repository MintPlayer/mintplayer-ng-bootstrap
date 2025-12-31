import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { firstValueFrom } from 'rxjs';
import { Tag } from '../../entities/tag';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private httpClient = inject(HttpClient);
  private baseUrl = 'https://mintplayer.com';

  public pageTags(request: PaginationRequest): Promise<PaginationResponse<Tag> | undefined> {
    return firstValueFrom(this.httpClient.post<PaginationResponse<Tag>>(`${this.baseUrl}/api/v1/Tag/page`, request));
  }

  public suggestTags(search: string, includeRelations: boolean = false): Promise<Tag[] | undefined> {
    return firstValueFrom(this.httpClient.post<Tag[]>(`${this.baseUrl}/web/v3/Tag/suggest`, { searchTerm: search }, {
      headers: { 'include_relations': String(includeRelations) }
    }));
  }

  public searchTags(search: string): Promise<Tag[] | undefined> {
    return firstValueFrom(this.httpClient.post<Tag[]>(`${this.baseUrl}/api/v1/Tag/search`, { searchTerm: search }));
  }

  public getTags(include_relations: boolean): Promise<Tag[] | undefined> {
    return firstValueFrom(this.httpClient.get<Tag[]>(`${this.baseUrl}/api/v1/Tag`, {
      headers: { 'include_relations': String(include_relations) }
    }));
  }

  public getTag(id: number, include_relations: boolean): Promise<Tag | undefined> {
    return firstValueFrom(this.httpClient.get<Tag>(`${this.baseUrl}/api/v1/Tag/${id}`, {
      headers: { 'include_relations': String(include_relations) }
    }));
  }

  public createTag(tag: Tag): Promise<Tag | undefined> {
    const clone = this.removeSubjects(tag);
    return firstValueFrom(this.httpClient.post<Tag>(`${this.baseUrl}/api/v1/Tag`, clone));
  }

  public updateTag(tag: Tag): Promise<Tag | undefined> {
    const clone = this.removeSubjects(tag);
    return firstValueFrom(this.httpClient.put<Tag>(`${this.baseUrl}/api/v1/Tag/${tag.id}`, clone));
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

  public deleteTag(tag: Tag): Promise<void> {
    return firstValueFrom(this.httpClient.delete<void>(`${this.baseUrl}/api/v1/Tag/${tag.id}`));
  }
}