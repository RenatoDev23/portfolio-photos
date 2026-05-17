import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private api = '/api/profile';

  constructor(private http: HttpClient) {}

  getProfile() {
    return this.http.get(this.api);
  }

  updateProfile(data: any) {
    return this.http.post(this.api, data);
  }

  incrementViews() {
    return this.http.post(`${this.api}/increment-views`, {});
  }
}

