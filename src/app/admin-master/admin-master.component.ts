import { Component, OnInit } from '@angular/core';
import { NotificationService } from 'src/app/common/services/notification.service';
import { MediaResponse, MediaService } from '../common/services/media.service';
import { PetService } from 'src/app/common/services/pet.service';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import * as moment from 'moment';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AUTO_STYLE,
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import _ from "lodash";

declare var $: any;

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget
}

const DEFAULT_DURATION = 300;


@Component({
  selector: 'app-admin-master',
  templateUrl: './admin-master.component.html',
  styleUrls: ['./admin-master.component.scss'],
  animations: [
    trigger('collapse', [
      state('false', style({ height: AUTO_STYLE, visibility: AUTO_STYLE })),
      state('true', style({ height: '0', visibility: 'hidden' })),
      transition('false => true', animate(DEFAULT_DURATION + 'ms ease-in')),
      transition('true => false', animate(DEFAULT_DURATION + 'ms ease-out'))
    ])
  ]
})
export class AdminMasterComponent implements OnInit {
  private mediaSubscription: Subscription;
  id: number = 1;

  petLogged: any;
  pet : any;
  users: any;
  Media: MediaResponse;
  loading: boolean = false;
  zoom: number = 12;
  lat: number = 9.93040049002793;
  lng: number = -84.09062837772197;

    constructor(private petService: PetService, private media: MediaService,private _notificationSvc: NotificationService, private router: Router, private formBuilder: FormBuilder) {
        this.petLogged = this.petService.getLocalPet()
        this.pet = JSON.parse(this.petLogged);
        if(this.pet != null){
        }else{
          this.router.navigate(['/home']);
          localStorage.clear();
          return;
        }

        this.mediaSubscription = this.media.subscribeMedia().subscribe(media => {
          this.Media = media;
        });
        
        this.getAllUsers();
    
    }    

    ngOnInit() {
    }

    getAllUsers() {
      this.petService.getLocationPetsList().subscribe(data => {
          this.users = data;
      },
      error => {
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor de revisar get all users', 6000);
      });
    }

    showPanel(item: any) {
      item.showPanel = !item.showPanel;
    }  
}
