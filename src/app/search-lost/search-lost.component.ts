import { Component, OnInit } from '@angular/core';
import { PetService } from '../common/services/pet.service';
import { MediaService, MediaResponse } from '../common/services/media.service';
import { NotificationService } from '../common/services/notification.service';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
declare var $: any;

@Component({
  selector: 'app-search-lost',
  templateUrl: './search-lost.component.html',
  styleUrls: ['./search-lost.component.scss']
})
export class SearchLostComponent implements OnInit {
  private mediaSubscription: Subscription;
  Media: MediaResponse;
  allUsersData: any;
  filteredData: any;
  loading: boolean = false;
  query: string;
  isShow: boolean;
  topPosToStartShowing = 100;
  elementDiv :any
  showPetLost: boolean = false;
  showFamilyLost: boolean = false;
  showSelect: boolean = true;
  infoPet: any;
  
  constructor(
    private petService: PetService,
    private media: MediaService,
    private _notificationSvc: NotificationService,
    private formBuilder: FormBuilder,
    private router: Router) {
      this.mediaSubscription = this.media.subscribeMedia().subscribe(result => {
        this.Media = result;
      });
    }

  ngOnInit() {
      this.getAllUsers();
  }

  getAllUsers() {
    this.petService.getPetsLostList().subscribe(data => {
        this.allUsersData = data;
        this.filteredData = this.allUsersData;
        // this.imageUrl = this.profile.photo;
    },
    error => {
    this.loading = false;
    this._notificationSvc.warning('Hola'+',', 'Ocurrio un error favor DE REVISAR', 6000);
    });
  }

  showMoreInfo(item:any){
    this.infoPet = item;
    $('#showDataProfile').modal('show');
  }

  divScroll(e, isClicked) {
    if(isClicked){
      e.srcElement.scrollTop =0;
    }
    this.elementDiv = e;
    if (e.target.scrollTop >= this.topPosToStartShowing) {
      this.isShow = true;
    } else {
      this.isShow = false;
    }
  }

  // TODO: Cross browsing
  gotoTop() {
    this.elementDiv.srcElement.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  selectSeach(select: number) {
    if(select == 1){
      this.showPetLost = false;
      this.showFamilyLost = true;
      this.showSelect = false;
    }
    if(select == 2){
      this.showPetLost = true;
      this.showFamilyLost = false;
      this.showSelect = false;
    }
    if(select == 3){
      this.showPetLost = false;
      this.showFamilyLost = false;
      this.showSelect = true;
    }
  }

  filterData(query): any[] {
    if (!query) {
      this.filteredData = this.allUsersData;
    }
    
    if(this.filteredData != undefined){
        this.filteredData = this.filteredData.filter(obj => {
            if (!query) {
                return obj;
            }
            return obj.petName.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        });
    }
    return this.filteredData;
  }


}
