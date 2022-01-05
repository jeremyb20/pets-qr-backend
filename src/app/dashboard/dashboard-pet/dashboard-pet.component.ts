import { Component, ElementRef, NgZone, OnInit, ViewChild, OnDestroy, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CalendarOptions } from '@fullcalendar/angular'; // useful for typechecking
import { Subscription, from } from 'rxjs';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { MediaResponse, MediaService } from '../../common/services/media.service';
import { darkStyle, lightStyle } from '../../common/constants/map-theme';
import * as moment from 'moment';
import { PetService } from 'src/app/common/services/pet.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import { Router } from '@angular/router';
import esLocale from '@fullcalendar/core/locales/es';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import { MapsAPILoader } from '@agm/core';
import {Location} from '@angular/common';

declare var $: any;

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget
}

@Component({
  selector: 'app-dashboard-pet',
  templateUrl: './dashboard-pet.component.html',
  styleUrls: ['./dashboard-pet.component.scss']
})
export class DashboardPetComponent implements OnInit {
  @Input() age;
  private mediaSubscription: Subscription;
  petLogged: any;
  pet : any;
  profile: any;
  Media: MediaResponse;
  newPetInfoForm: FormGroup;
  newEventForm: FormGroup;
  newLostPetForm: FormGroup;
  registerForm: FormGroup;
  submitted = false;
  loading: boolean = false;
  loadingQr: boolean = false;
  file : File;
  photoSelected: String | ArrayBuffer;
  hideMsg: boolean = true;
  ShowMsg: string = 'hola';
  code: any;
  id: number;
  permissionData: any;
  permissionDataCopy: any;
  updatePermission: boolean = false;
  petStatusInfo: string;
  showReportForm: boolean = false;
  petStatus: string;
  photoPrincipalPet: string;
  eventsCalendar: any;
  timeSeconds: number = 3000;
  isSetPosition: boolean = false;

// calendar 

isNewEvent: boolean = false;
events: any;
idEventUpdate: any;

  private localUserSubscription : Subscription;
  public searchControl: FormControl;
  zoom: number = 17;
  lat: number = 9.93040049002793;
  lng: number = -84.09062837772197;
  distance: number;
  previous;
  coords: any;
  located: boolean;
  end_address: string;
  duration: string;
  showInfo: boolean = true;
  showInfoNewPet: boolean = true;
  addDestiny: boolean = false;
  showInfoFinal: boolean = false;
  trackingRoute: boolean = false;
  markersNewPet: marker[] = [];
  confirmData: any;
  origin : any;
  destination : any;
  FilteredPetStatus: any;
  bussinesType = [
    {Id: 1, gender: 'Macho'},
    {Id: 2, gender: 'Hembra'}
  ];
  currentTimer: any;
  idSecondary: number = 0;
  seeAllProfile: any;
  petPrincipal: any;
  
  constructor(private petService: PetService, private media: MediaService, private formBuilder: FormBuilder, private mapsAPILoader: MapsAPILoader, private ngZone: NgZone, private _location: Location, private _notificationSvc: NotificationService, private router: Router) {
    this.petLogged = this.petService.getLocalPet()
    this.pet = JSON.parse(this.petLogged);
    this.idSecondary = this.pet.idSecond;
    var petPrincipal = this.petService.getPrincipalUserData();
    var idSelected = this.petService.getidTrack();
    this.id = parseInt(idSelected);
    this.stepTrackOrder(this.id);
    this.petPrincipal = JSON.parse(petPrincipal);
    if(this.pet != null){
      switch (this.pet.userState) {
        case 0:
          this.router.navigate(['/admin']);
          break;
        case 3:
          this.router.navigate(['/dashboard-pet']);
          break;

        default:
          break;
      }
    }else{
      this.router.navigate(['/home']);
      localStorage.clear();
      return;
    }

    var today = new Date()
    var curHr = today.getHours()
    
    if (curHr < 12) {
      this.currentTimer = lightStyle;
    } else if (curHr < 18) {
      this.currentTimer = darkStyle;
    } else {
      this.currentTimer = darkStyle;
    }

    this.mediaSubscription = this.media.subscribeMedia().subscribe(media => {
      this.Media = media;
    });

    this.getPetDataList();
  }

  get h() { return this.newLostPetForm.controls; }
  get i() { return this.registerForm.controls; }

  ngOnInit() {  
    this.newLostPetForm = this.formBuilder.group({
      lastPlaceLost: ['', Validators.required],
      date: ['', [Validators.required]],
      descriptionLost: ['', Validators.required],
    });

    this.registerForm = this.formBuilder.group({
      petName: ['', Validators.required],
      genderSelected: ['Genero del Can', Validators.required],
      ownerPetName: ['', Validators.required],
      birthDate: ['', [Validators.required]],
      phone: ['', [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
      address: ['', [Validators.required]],
      email: ['', [Validators.required]],
      age: ['', [Validators.minLength(0),Validators.required,Validators.pattern(/\d/)]],
      veterinarianContact: ['', Validators.required],
      phoneVeterinarian: ['', [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
      healthAndRequirements: ['', Validators.required],
      favoriteActivities: ['', Validators.required],
      linkTwitter: [''],
      linkFacebook: [''],
      linkInstagram: [''],
    });

    this.FilteredPetStatus = [
      {Id: 0, Name:'No-Perdido'},
      {Id: 1, Name:'Perdido'}
    ];
  }

  stepTrackOrder(step: number){
    this.id = step;
    this.petService.setidTrack(this.id);
  }

  getPetDataList() {
    var view = 2;
    this.petService.getPetDataList(this.pet.id, this.idSecondary, view).subscribe(data => {
      if(data.success){
        this.profile = data.pet;
        // this.seeAllProfile = data.newPetProfile;
        // this.photoPrincipalPet = data.photo;
        this.petStatusInfo = this.profile.petStatus;
        this.showReportForm = (this.profile.petStatus == 'Perdido')? true: false;
        this.newPetInfoForm = this.formBuilder.group({
          petName: [this.profile.petName, Validators.required],
          ownerPetName: [this.profile.ownerPetName, Validators.required],
          birthDate: [this.profile.birthDate, [Validators.required]],
          phone: [this.profile.phone, [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
          address: [this.profile.address, [Validators.required]],
          email: [this.profile.email, [Validators.required]],
          age: [this.profile.age, [Validators.minLength(0),Validators.required,Validators.pattern(/\d/)]],
          veterinarianContact: [this.profile.veterinarianContact, Validators.required],
          phoneVeterinarian: [this.profile.phoneVeterinarian, [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
          healthAndRequirements: [this.profile.healthAndRequirements, Validators.required],
          favoriteActivities: [this.profile.favoriteActivities],
          linkTwitter: [this.profile.linkTwitter = (this.profile.linkTwitter == 'null')? this.profile.linkTwitter = '': this.profile.linkTwitter],
          linkFacebook: [this.profile.linkFacebook = (this.profile.linkFacebook == 'null')? this.profile.linkFacebook = '': this.profile.linkFacebook],
          linkInstagram: [this.profile.linkInstagram = (this.profile.linkInstagram == 'null')? this.profile.linkInstagram = '': this.profile.linkInstagram],
        });
  
        let objectStored = {
          id: this.pet.id,
          idSecond: this.idSecondary,
          petName: this.profile.petName,
          photo: this.profile.photo,
          userState: this.profile.userState
        }
        this.petService.setstoreUserData(objectStored);
        this.showInfo = true;
        this.getPetProfileList();

      }else{
        this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  getPetProfileList(){
    this.petService.getAllProfileList(this.petPrincipal.id).subscribe(data => {
      this.photoPrincipalPet = data.photo;
      this.seeAllProfile = data.newPetProfile;
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }
  


  AfterContentInit() {
    this.searchControl = new FormControl();
  }


  setCurrentNewPosition() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.zoom = 17;
        
        this.markersNewPet.push({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          draggable: false,
          isDestination: false,
          photo: 'https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg'
        });

        this.showInfoNewPet = true;
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  mapClickedNewPet($event: MouseEvent) {
    var event: any;
    event = $event
    this.showInfoNewPet = true;
    this.zoom = 17;
    if(this.markersNewPet.length ==0 ){
      this.markersNewPet.push({
        lat: event.coords.lat,
        lng: event.coords.lng,
        draggable: false,
        isDestination: false,
        photo: "https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg"
      });
      this.isSetPosition = true;
    }
  }
  
  changePositionNewPet(mPosition: any){
    this.showInfoNewPet = false;
    this.isSetPosition = false;
    if (this.markersNewPet.length > 0) {
      this.markersNewPet.shift();
    }
  }

  savePositionNewPet() {
    this.showInfoNewPet = false;
    this.isSetPosition = true;
  }

  //Photo

  updatePhoto(){
    $('#updatePhotoModal').modal('show');
  }

  updatePhotoSubmit(){
    this.loading = true;
    this.petService.updatePhotoPetProfile(this.pet.id, this.idSecondary, this.file).subscribe(data => {
      if(data.success) {
        $('#updatePhotoModal').modal('hide');
        this._notificationSvc.success('Hola '+this.pet.petName+'', data.msg, 6000);
        this.loading = false;
        location.reload();
      } else {
        $('#updatePhotoModal').modal('hide');
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.pet.petName+'', data.msg, 6000);
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  processFile(event: HtmlInputEvent): void {

    if(event.target.files && event.target.files[0]){
      this.file = <File>event.target.files[0];

      if(this.file.type == String('image/png') || this.file.type == String('image/jpg') || this.file.type == String('image/jpeg') ){
        const reader = new FileReader();

        reader.onload = e => this.photoSelected = reader.result;
        reader.readAsDataURL(this.file);
      }else{
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: 'Oops...',
          text: 'Solo se permite formatos JPG, PNG, JPEG',
          confirmButtonText: 'OK',
        })
      }
    }
  }

  goShopping() {
    this.router.navigate(['/shopping-cart']);
  }

  goToProfile() {
    this.router.navigate(['/myPetCode/'],{ queryParams: {id: this.pet.id, idSecond: this.idSecondary}}); 
  }

  reportProfile(){
    $('#reportProfileModal').modal('show');
  }

  changeLeagueOwner(e:any){
    this.showReportForm = (e == 0)? false : true;
  }

  sendPetStatusLost() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.newLostPetForm.invalid) {
        return;
    }
    this.loading = true;
    var form = {
      lastPlaceLost: this.h.lastPlaceLost.value,
      date: this.h.date.value,
      descriptionLost: this.h.descriptionLost.value,
      idSecondary: this.idSecondary,
      _id: this.pet.id
    } 
      
    var status =  {
      petStatus : (this.showReportForm)? 'Perdido' : 'No-Perdido',
      petName: this.profile.petName
    }
    this.petService.sendNewPetStatusEvent(form, status).subscribe(data => {
      if(data.success) {
        $('#reportProfileModal').modal('hide');
        this._notificationSvc.success('Hola '+this.pet.petName+'', data.msg, 6000);
        this.loading = false;
        this.getPetDataList();
      } else {
        $('#reportProfileModal').modal('hide');
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.pet.petName+'', data.msg, 6000);
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  updateReportStatus() {
    var status =  {
      petStatus : (!this.showReportForm)? 'No-Perdido' : 'Perdido',
      petName: this.profile.petName,
      _id: this.pet.id
    }

    this.petService.updatePetStatusReport(status).subscribe(data => {
      if(data.success) {
        $('#reportProfileModal').modal('hide');
        this._notificationSvc.success('Hola '+this.pet.petName+'', data.msg, 6000);
        this.loading = false;
        this.getPetDataList();
      } else {
        $('#reportProfileModal').modal('hide');
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.pet.petName+'', data.msg, 6000);
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  // register pet

  newPetRegister(){
    if(this.seeAllProfile.length <= 1){
      this.registerForm = this.formBuilder.group({
        petName: ['', Validators.required],
        genderSelected: ['Genero del Can', Validators.required],
        ownerPetName: [this.profile.ownerPetName, Validators.required],
        birthDate: ['', [Validators.required]],
        phone: ['', [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
        address: [this.profile.address, [Validators.required]],
        // email: [{value:this.profile.email, disabled: true}, [Validators.required]],
        age: ['', [Validators.minLength(0),Validators.required,Validators.pattern(/\d/)]],
        veterinarianContact: ['', Validators.required],
        phoneVeterinarian: ['', [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
        healthAndRequirements: ['', Validators.required],
        favoriteActivities: ['', Validators.required],
      });
  
      this.setCurrentNewPosition();
  
      $('#newPetModal').modal('show');
    }else{
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'Oops...',
        text: 'Lo sentimos, por el momento solo aceptamos 3 perritos por correo',
        confirmButtonText: 'OK',
      })
    }
  }

  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.registerForm.invalid) {
        return;
    }
    if(this.i.genderSelected.value  === 'Genero del Can'){
      Swal.fire({
        title: 'Error de registro' ,
        html: "Seleccione el Genero del Can",
        showCancelButton: false,
        allowEscapeKey: false,
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        buttonsStyling: false,
        reverseButtons: true,
        position: 'top',
        padding: 0,
        customClass: { confirmButton: 'col-auto btn btn-info m-3' }
      })
      .then((result) => {
            
      });
      return;
    }else  if(!this.isSetPosition){
      Swal.fire({
        title: 'Error de registro' ,
        html: "Seleccione en el mapa la posicion de vivienda del can",
        showCancelButton: false,
        allowEscapeKey: false,
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        buttonsStyling: false,
        reverseButtons: true,
        position: 'top',
        padding: 0,
        customClass: { confirmButton: 'col-auto btn btn-info m-3' }
      })
      .then((result) => {
        this.isSetPosition = true;
      });
      return;
    } else  if(this.file == undefined){
      Swal.fire({
        title: 'Error de registro' ,
        html: "Seleccione una foto de perfil para el can",
        showCancelButton: false,
        allowEscapeKey: false,
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        buttonsStyling: false,
        reverseButtons: true,
        position: 'top',
        padding: 0,
        customClass: { confirmButton: 'col-auto btn btn-info m-3' }
      })
      .then((result) => {
            
      });
      return;
    } else {
      if(this.markersNewPet.length != 0) {

        this.loading = true;
        var newPet = {
          petName: this.i.petName.value,
          phone: this.i.phone.value,
          email: this.petPrincipal.email,
          lat: this.markersNewPet[0].lat,
          lng: this.markersNewPet[0].lng,
          genderSelected: this.i.genderSelected.value,
          userState: 3,
          petStatus: 'No-Perdido',
          ownerPetName: this.i.ownerPetName.value,
          birthDate: this.i.birthDate.value,
          address: this.i.address.value,
          age: this.i.age.value,
          veterinarianContact: this.i.veterinarianContact.value,
          phoneVeterinarian: this.i.phoneVeterinarian.value,
          healthAndRequirements: this.i.healthAndRequirements.value,
          favoriteActivities: this.i.favoriteActivities.value,
          _id: this.pet.id,
        }
  
        this.petService.registerNewPetByUserPet(newPet,this.file).subscribe(data => {
          if(data.success) {
            this.loading = false;

            Swal.fire({
              position: 'center',
              icon: 'success',
              title: 'Registro ' + newPet.petName+'',
              html: data.msg,
              confirmButtonText: 'OK',
            })
            .then((result) => {
                if (result.value){
                  $('#newPetModal').modal('hide');
                  location.reload();
                }
                  
            });
          } else {
            this.hideMsg = true;
            this.loading = false;
            this.ShowMsg = data.msg;
            setTimeout(() => { this.hideMsg = false }, this.timeSeconds);
          }
        },
        error => {
          this.hideMsg = true;
          this.loading = false;
          this.ShowMsg = "Ocurrio un error favor contactar a soporte o al administrador del sitio";
          setTimeout(() => { this.hideMsg = false }, this.timeSeconds);
        });
      }
    }
  }

  changeProfilePet() {
    $('#changeProfileModal').modal('show');
  }

  deleteProfilePet() {
    $('#deleteProfileModal').modal('show');
  }

  profileSelected(val:any){
    if(val != 1){
      this.idSecondary = val.id
      this.pet.id = this.petPrincipal.id
      this.getPetDataList();
    }else{
      this.idSecondary = this.petPrincipal.idSecond
      this.pet.id = this.petPrincipal.id
      this.getPetDataList();
    }
    $('#changeProfileModal').modal('hide');
  }

  profileDeleteSelected(item:any) {
    Swal.fire({
      title: 'Estás seguro?',
      text: "No serás capaz de revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        var remove = {
          _id: this.petPrincipal.id,
          idItem: item.id
        }

        this.petService.deletePetProfile(remove).subscribe(data => {
          if(data.success) {
              Swal.fire({
                position: 'center',
                icon: 'success',
                title: 'Genial',
                text: data.msg,
                confirmButtonText: 'OK',
              }).then((result) => {
                if (result.isConfirmed) {
                  this.loading = false;
                  let objectStored = {
                    id: this.petPrincipal.id,
                    idSecond: 0,
                    petName: this.petPrincipal.petName,
                    photo: this.petPrincipal.photo,
                    userState: this.petPrincipal.userState
                  }
                  this.petService.setstoreUserData(objectStored);
                  this.getPetDataList();
                  location.reload();
                }
              })
          } else {
            Swal.fire({
              position: 'center',
              icon: 'error',
              title: 'Oops...',
              text: 'Ha ocurrido un problema, favor de revisar',
              confirmButtonText: 'OK',
            })
          }
        },
        error => {
          this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
        });
      }
    })
  }
}

interface marker {
	lat: number;
	lng: number;
	label?: string;
  draggable: boolean;
  isDestination?: boolean;
  photo?: any;
}
