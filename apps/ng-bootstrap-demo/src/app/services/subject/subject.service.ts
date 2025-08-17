import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Subject } from '../../entities/subject';
import { ESubjectType } from '../../enums/subject-type';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  httpClient = inject(HttpClient);
  baseUrl = 'https://mintplayer.com';

  public suggest(search: string, subjects: ESubjectType[], includeRelations = false) {
    return this.httpClient.post<Subject[]>(`${this.baseUrl}/api/v1/subject/search/suggest`, {
      searchTerm: search,
      subjectTypes: subjects
    }, {
      headers: {
        include_relations: String(includeRelations)
      }
    });
  }
}
