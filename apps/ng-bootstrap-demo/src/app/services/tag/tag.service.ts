import { Injectable } from '@angular/core';
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';
import { Tag } from '../../entities/tag';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private baseUrl = 'https://mintplayer.com';

  public async pageTags(request: PaginationRequest): Promise<PaginationResponse<Tag> | undefined> {
    const response = await fetch(`${this.baseUrl}/api/v1/Tag/page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  }

  public async suggestTags(search: string, includeRelations: boolean = false): Promise<Tag[] | undefined> {
    const response = await fetch(`${this.baseUrl}/web/v3/Tag/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'include_relations': String(includeRelations)
      },
      body: JSON.stringify({ searchTerm: search })
    });
    return response.json();
  }

  public async searchTags(search: string): Promise<Tag[] | undefined> {
    const response = await fetch(`${this.baseUrl}/api/v1/Tag/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerm: search })
    });
    return response.json();
  }

  public async getTags(include_relations: boolean): Promise<Tag[] | undefined> {
    const response = await fetch(`${this.baseUrl}/api/v1/Tag`, {
      headers: { 'include_relations': String(include_relations) }
    });
    return response.json();
  }

  public async getTag(id: number, include_relations: boolean): Promise<Tag | undefined> {
    const response = await fetch(`${this.baseUrl}/api/v1/Tag/${id}`, {
      headers: { 'include_relations': String(include_relations) }
    });
    return response.json();
  }

  public async createTag(tag: Tag): Promise<Tag | undefined> {
    const clone = this.removeSubjects(tag);
    const response = await fetch(`${this.baseUrl}/api/v1/Tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clone)
    });
    return response.json();
  }

  public async updateTag(tag: Tag): Promise<Tag | undefined> {
    const clone = this.removeSubjects(tag);
    const response = await fetch(`${this.baseUrl}/api/v1/Tag/${tag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clone)
    });
    return response.json();
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

  public async deleteTag(tag: Tag): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/Tag/${tag.id}`, {
      method: 'DELETE'
    });
  }
}