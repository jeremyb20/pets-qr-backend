import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LocationsService {
  baseUrl: string;

  constructor(private httpClient: HttpClient) {
    this.baseUrl = 'https://restcountries.eu/rest/v2/regionalbloc/eu';
  }

  getAll(): Promise<any[]> {
  return this.httpClient.get<any>(this.baseUrl).toPromise();
  }
}
