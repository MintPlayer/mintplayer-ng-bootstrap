import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Subject } from '../../entities/subject';
import { ESubjectType } from '../../enums/subject-type';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  constructor(private httpClient: HttpClient) {
  }

  private baseUrl = 'https://mintplayer.com';

  public suggestAsync(search: string, subjects: ESubjectType[], includeRelations = false) {
    return firstValueFrom(this.httpClient.post<Subject[]>(`${this.baseUrl}/api/v1/subject/search/suggest`, {
      searchTerm: search,
      subjectTypes: subjects
    }, {
      headers: {
        include_relations: String(includeRelations)
      }
    }));
  }
}
