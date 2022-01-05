import { Component, OnInit } from '@angular/core';
import { NotificationService } from 'src/app/common/services/notification.service';
import { PetService } from 'src/app/common/services/pet.service';
import { darkStyle, lightStyle } from '../../common/constants/map-theme';

declare var $: any;


@Component({
  selector: 'app-location-pets',
  templateUrl: './location-pets.component.html',
  styleUrls: ['./location-pets.component.scss']
})
export class LocationPetsComponent implements OnInit {
  public renderOptions = {
    suppressMarkers: true,
  }
  public markerOptions = {
    origin: {
        icon: 'https://i.imgur.com/iYIaFyb.png',
        draggable: false,
    },
    destination: {
        icon: 'https://i.imgur.com/iYIaFyb.png',
        opacity: 0.8,
    },
  }
  destination : any;
  origin : any;
  zoom: number = 17;
  lat: number = 9.93040049002793;
  lng: number = -84.09062837772197;
  showInfo: boolean = true;
  generate: boolean = false;
  markers: marker[] = [];
  loading: boolean = false;
  pet : any;
  petLogged: any;
  idSecondary: number = 0;
  id: number;
  petPrincipal: any;
  currentTimer: any;
  constructor(public petService: PetService,private _notificationSvc: NotificationService,) {

    this.petLogged = this.petService.getLocalPet();
    this.pet = JSON.parse(this.petLogged);
    this.idSecondary = this.pet.idSecond;
    var petPrincipal = this.petService.getPrincipalUserData();
    var idSelected = this.petService.getidTrack();
    this.id = parseInt(idSelected);
    this.petPrincipal = JSON.parse(petPrincipal);

    var today = new Date()
    var curHr = today.getHours()
    if (curHr < 12) {
      this.currentTimer = lightStyle;
    } else if (curHr < 18) {
      this.currentTimer = darkStyle;
    } else {
      this.currentTimer = darkStyle;
    }

    this.getLocationInfo();
  }

  ngOnInit(): void {
  }

  getLocationInfo() {
    this.petService.getLocationInfoService(this.pet.id, this.idSecondary).subscribe(data => {
      this.markers = [];
      this.markers.push({
        lat: data.lat,
        lng: data.lng,
        draggable: false,
        isDestination: false,
        photo: data.photo
      });
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  mapClicked($event: MouseEvent) {
    var event: any;
    event = $event
    this.showInfo = true;
    this.zoom = 17;
    if(this.markers.length ==0 ){
      this.markers.push({
        lat: event.coords.lat,
        lng: event.coords.lng,
        draggable: false,
        isDestination: false,
        photo: "https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg"
      });
    }
  }

  changePosition(mPosition: any){
    this.showInfo = false;
    if (this.markers.length > 0) {
      this.markers.shift();
    }
  }

  setCurrentPosition() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.zoom = 17;

        this.markers.push({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          draggable: false,
          isDestination: false,
          photo: this.pet.photo
        });
        this.showInfo = true;
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  savePosition() {
    this.showInfo = false;
    var pet = {
      lat: this.markers[0].lat,
      lng: this.markers[0].lng,
      idSecond: this.idSecondary,
      _id: this.pet.id
    }
    
    this.petService.updatePetLocation(pet).subscribe(data => {
      if(data.success) {
        this._notificationSvc.success('Hola '+this.pet.petName+'', data.msg, 6000);
        this.loading = false;
       location.reload();
      } else {
        $('#newMenuModal').modal('hide');
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.pet.petName+'', data.msg, 6000);
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });

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
