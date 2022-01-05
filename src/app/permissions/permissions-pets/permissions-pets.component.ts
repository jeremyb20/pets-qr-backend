import { Component, OnInit } from '@angular/core';
import { NotificationService } from 'src/app/common/services/notification.service';
import { PetService } from 'src/app/common/services/pet.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';


@Component({
  selector: 'app-permissions-pets',
  templateUrl: './permissions-pets.component.html',
  styleUrls: ['./permissions-pets.component.scss']
})
export class PermissionsPetsComponent implements OnInit {
  permissionData: any;
  permissionDataCopy: any;
  updatePermission: boolean = false;
  loading: boolean = false;
  loadingQr: boolean = false;
  profile: any;
  pet : any;
  petLogged: any;
  idSecondary: number = 0;
  id: number;
  petPrincipal: any;


  constructor(private petService: PetService,private _notificationSvc: NotificationService,) {
    this.petLogged = this.petService.getLocalPet()
    this.pet = JSON.parse(this.petLogged);
    this.idSecondary = this.pet.idSecond;
    var petPrincipal = this.petService.getPrincipalUserData();
    var idSelected = this.petService.getidTrack();
    this.id = parseInt(idSelected);
    this.petPrincipal = JSON.parse(petPrincipal);
    this.getPermissionInfo();
  }

  ngOnInit(): void {
  }

  getPermissionInfo() {
    this.petService.getPetPermissionsDataList(this.pet.id, this.idSecondary).subscribe(data => {
      this.updatePermission = false;
      this.permissionData = data.permissions[0];
      if(this.permissionData == undefined || this.permissionData.length<=0){
        this.permissionData = {
          showPhoneInfo: true,
          showEmailInfo: true,
          showLinkTwitter: true,
          showLinkFacebook: true,
          showLinkInstagram: true,
          showOwnerPetName: true,
          showBirthDate: true,
          showAddressInfo: true,
          showAgeInfo: true,
          showVeterinarianContact: true,
          showPhoneVeterinarian: true,
          showHealthAndRequirements: true,
          showFavoriteActivities: true,
          showLocationInfo:true
        }
      }else{
        this.permissionData = data.permissions[0];
      }
      this.getPetDataList();
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  getPetDataList() {
    var view = 1;
    this.petService.getPetDataList(this.pet.id, this.idSecondary, view).subscribe(data => {
      if(data.success){
        this.profile = data.pet;
      }else{
        this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }


  changed(item:any) {
    this.updatePermission = true;
    this.permissionData = item;
  }

  updatePermissionList() {
    var object  = {
      id: this.pet.id,
      idSecondary: this.idSecondary,
      showPhoneInfo: this.permissionData.showPhoneInfo,
      showEmailInfo: this.permissionData.showEmailInfo,
      showLinkTwitter: this.permissionData.showLinkTwitter,
      showLinkFacebook: this.permissionData.showLinkFacebook,
      showLinkInstagram: this.permissionData.showLinkInstagram,
      showOwnerPetName: this.permissionData.showOwnerPetName,
      showBirthDate: this.permissionData.showBirthDate,
      showAddressInfo: this.permissionData.showAddressInfo,
      showAgeInfo: this.permissionData.showAgeInfo,
      showVeterinarianContact: this.permissionData.showVeterinarianContact,
      showPhoneVeterinarian: this.permissionData.showPhoneVeterinarian,
      showHealthAndRequirements: this.permissionData.showHealthAndRequirements,
      showFavoriteActivities: this.permissionData.showFavoriteActivities,
      showLocationInfo: this.permissionData.showLocationInfo
    }

    this.petService.updatePetPermissionInfo(object).subscribe(data => {
      if(data.success){
        Swal.fire({
          position: 'center',
          icon: 'success',
          title: 'Genial',
          text: data.msg,
          confirmButtonText: 'OK',
        }).then((result) => {
          if (result.isConfirmed) {
            location.reload();
          }
        })
      }
      
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

}
