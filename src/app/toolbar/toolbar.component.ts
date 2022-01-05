import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthServices } from '../common/services/auth.service';
import { MediaService, MediaResponse } from '../common/services/media.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { PetService } from '../common/services/pet.service';
import { NotificationService } from '../common/services/notification.service';
import * as moment from 'moment';
declare var $ : any;

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {
  private mediaSubscription: Subscription;
  Media: MediaResponse;
  userLogged: any;
  user:any;
  loading: boolean = false;
  notificationsData: any;
  isNewMsg: number = 0;
  isFoo:boolean = false;
  showAllNotifications: any;

  constructor(public authService: AuthServices, public petService: PetService, private _notificationSvc: NotificationService, private media: MediaService,private route: Router, private cdRef:ChangeDetectorRef) { 
    this.mediaSubscription = this.media.subscribeMedia().subscribe(result => {
      this.Media = result;
      if(this.Media.IsLandscape) {
        $('#wrapper').addClass('toggled')
      }
      if(this.user){
        if(this.user.userState == 0 || this.Media.IsLandscape) {
          $('#wrapper').removeClass('toggled')
        }
      }
    });
    this.userLogged = this.authService.getLocalUser();
    if(this.userLogged == null ){
        this.userLogged = this.petService.getLocalPet();
    }
    this.user = JSON.parse(this.userLogged);
    if(this.user){
      if (this.user.userState == 0 || this.Media.IsLandscape) {
        $('#wrapper').removeClass('toggled')
      }
      this.getNotifications();
    }
   
  }

  ngAfterViewChecked(){
    var test = this.petService.loggedIn();
    if(!test){
      this.petService.logout();
      this.cdRef.detectChanges();
    }
  }

  ngOnInit(): void {
  }

  logout() {
    this.petService.logout();
    this.route.navigate(['/home'])
  }

  getNotifications() {
    this.notificationsData = [];
    this.isNewMsg = 0;
    this.petService.getNotificationsService(this.user.id).subscribe(data => {
        // this.notificationsData = data;
        data.map((item, index)=> {
          if(index<= 5){
            this.notificationsData.push(item);
          }
          
        });
        this.showAllNotifications = data;
        this.notificationsData.forEach(element => {
            if(element.isNewMsg){
                this.isNewMsg ++;
            }
        });
      },
      error => {
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.user.petName+'', 'Ocurrio un error favor de contactar a soporte', 6000);
      });
  }

  showAllNotificationsModal(){
    this.isFoo = false;
    $('#showAllnotificationsModal').addClass('test');
    $('#showAllnotificationsModal').modal('show');
    
  }

  getDate(strDate) {
    return moment(new Date(strDate)).locale('es').calendar(); 
  }

  goHome(){
    // $('#wrapper').removeClass('toggled')
    if(this.user.userState == 0 ){
      this.route.navigate(['/admin'])
    }

    if(this.user.userState == 3 ){
      if(this.Media.IsMobile){
        $('#wrapper').removeClass('toggled')
      }
        
      this.route.navigate(['/dashboard-pet']);
    }
  }

  updateNotification(item: any){
    var object = {
      id: this.user.id,
      isNewMsg: false,
      idItem: item._id
    }

    this.petService.updateNotification(object).subscribe(data => {
      if(data.success) {
        this.isNewMsg --;
        this.getNotifications();
      } else {
        this._notificationSvc.warning('Hola '+this.user.petName+'', data.msg, 6000);
      }
    },
    error => {
      this._notificationSvc.warning('Hola '+this.user.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  deleteNotification(item: any){
    var object = {
      id: this.user.id,
      idItem: item._id
    }

    this.petService.deleteNotification(object).subscribe(data => {
      if(data.success) {
        this.getNotifications();
      } else {
        this._notificationSvc.warning('Hola '+this.user.petName+'', data.msg, 6000);
      }
    },
    error => {
      this._notificationSvc.warning('Hola '+this.user.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

}
