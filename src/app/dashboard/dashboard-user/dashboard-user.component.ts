import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthServices } from 'src/app/common/services/auth.service';
import { FormControl } from "@angular/forms";
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { MediaResponse, MediaService } from '../../common/services/media.service';
import * as moment from 'moment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-user',
  templateUrl: './dashboard-user.component.html',
  styleUrls: ['./dashboard-user.component.scss']
})
export class DashboardUserComponent implements OnInit, OnDestroy {
  // private localUserSubscription : Subscription;
  public searchControl: FormControl;
  private mediaSubscription: Subscription;

  userLogged: any;
  user : any;
  Media: MediaResponse;

  showToolbarMenu: boolean = true;
  showMapInfo: boolean = false;

  constructor(private authService: AuthServices, private media: MediaService, private router: Router) {
      //this.located = false;
      this.userLogged = this.authService.getLocalUser()
      this.user = JSON.parse(this.userLogged);
      if(this.user != null){
        switch (this.user.userState) {
          case 1:
            this.router.navigate(['/dashboard-user']);
            break;
          case 2:
            this.router.navigate(['/dashboard-driver']);
            break;

          case 3:
            this.router.navigate(['/dashboard-company']);
            break;

          default:
            break;
        }
      }else{
        this.router.navigate(['/home']);
        localStorage.clear();
        return;
      }
      this.mediaSubscription = this.media.subscribeMedia().subscribe(media => {
        this.Media = media;
      });
  }

  ngOnInit() {
   
  }

  ngOnDestroy(){
    if(this.mediaSubscription){
      this.mediaSubscription.unsubscribe();
    }
  }


}
