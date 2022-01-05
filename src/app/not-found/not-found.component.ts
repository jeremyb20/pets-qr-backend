import { Component, OnInit } from '@angular/core';
import { AuthServices } from '../common/services/auth.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements OnInit {

  constructor(public authService: AuthServices) {
    localStorage.clear();
   }

  ngOnInit(): void {
  }

}
