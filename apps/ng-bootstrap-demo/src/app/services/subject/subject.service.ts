import { Injectable } from '@angular/core';
import { Subject } from '../../entities/subject';
import { ESubjectType } from '../../enums/subject-type';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private baseUrl = 'https://mintplayer.com';

  public async suggest(search: string, subjects: ESubjectType[], includeRelations = false): Promise<Subject[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/subject/search/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'include_relations': String(includeRelations)
      },
      body: JSON.stringify({
        searchTerm: search,
        subjectTypes: subjects
      })
    });
    return response.json();
  }
}
