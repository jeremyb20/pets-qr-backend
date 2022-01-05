import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import {Location} from '@angular/common';
import { AuthServices } from 'src/app/common/services/auth.service';
import { FormControl } from "@angular/forms";
import { MapsAPILoader } from '@agm/core';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { MediaResponse, MediaService } from '../common/services/media.service';
import { darkStyle, lightStyle } from '../common/constants/map-theme';
import * as moment from 'moment';
import { Router } from '@angular/router';
import { PetService } from '../common/services/pet.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  private localUserSubscription : Subscription;
  public searchControl: FormControl;
  private mediaSubscription: Subscription;
  zoom: number = 12;
  lat: number = 9.93040049002793;
  lng: number = -84.09062837772197;
  distance: number;
  previous;
  coords: any;
  located: boolean;
  petLogged: any;
  pet : any;
  end_address: string;
  duration: string;
  start_address: string;
  showInfo: boolean = true;
  addDestiny: boolean = false;
  generate: boolean = false;
  getTrack: boolean = false;
  showInfoFinal: boolean = false;
  trackingRoute: boolean = false;
  markers: marker[] = [];
  Media: MediaResponse;
  confirmData: any;
  origin : any;
  destination : any;

  currentTimer: any;

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


  @ViewChild("search")
  public searchElementRef: ElementRef;

  constructor(private petService: PetService, private mapsAPILoader: MapsAPILoader, private ngZone: NgZone, private media: MediaService, private router: Router, private _location: Location) {
      this.located = false;
      this.petLogged = this.petService.getLocalPet()
      this.pet = JSON.parse(this.petLogged);
      this.mediaSubscription = this.media.subscribeMedia().subscribe(media => {
        this.Media = media;
      });
      this.setCurrentPosition();

      var today = new Date()
      var curHr = today.getHours()
      
      if (curHr < 12) {
        console.log('good morning')
        this.currentTimer = lightStyle;
      } else if (curHr < 18) {
        this.currentTimer = darkStyle;
        console.log('good afternoon')
      } else {
        this.currentTimer = darkStyle;
        console.log('good evening')
      }
  }

  ngOnInit() {
     //create search FormControl
     this.searchControl = new FormControl();
    
     //set current position

      //load Places Autocomplete
    this.mapsAPILoader.load().then(() => {
      let autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement, {
        componentRestrictions: { country: 'CR' }
      });
      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          //get the place result
          let place: google.maps.places.PlaceResult = autocomplete.getPlace();
  
          //verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }

          this.zoom = 12;

          this.markers.push({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            draggable: false,
            isDestination: true,
            photo: 'https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg'
          });
          this.showInfoFinal = true;
          this.addDestiny = true;
          this.generate = true;
          this.origin = { lat: this.markers[0].lat, lng: this.markers[0].lng }
          this.destination = { lat: this.markers[1].lat, lng: this.markers[1].lng }
          
          this.distance = this.calcDistance(this.markers[0].lat, this.markers[0].lng, this.markers[1].lat, this.markers[1].lng );
          this.distance = this.roundToTwo(this.distance/1000);
        });
      });
    });
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
        this.addDestiny = false;
        this.generate = false;
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  clickedMarker(infowindow) {
    if (this.previous != undefined) {
      if( this.previous.close() != undefined)
          this.previous.close();
    }
    this.previous = infowindow;
  }
  
  goBack() {
    this._location.back();
  }
  
  getDirection() {
    this.addDestiny = true;
  }

  mapClicked($event: MouseEvent) {
    var event: any;
      event = $event
    this.showInfo = true;
    if(this.addDestiny){
      if (this.markers.length < 2) {
        this.markers.push({
          lat: event.coords.lat,
          lng: event.coords.lng,
          draggable: false,
          isDestination: true,
          photo: 'https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg'
        });
        this.zoom = 20;
        this.generate = true;
        this.showInfo = false;
        this.showInfoFinal = true;
        this.origin = { lat: this.markers[0].lat, lng: this.markers[0].lng }
        this.destination = { lat: this.markers[1].lat, lng: this.markers[1].lng }
        this.distance = this.calcDistance(this.markers[0].lat, this.markers[0].lng, this.markers[1].lat, this.markers[1].lng );
        this.distance = this.roundToTwo(this.distance/1000);
      }
    }else{
      if (this.markers.length < 1) {
        this.markers.push({
          lat: event.coords.lat,
          lng: event.coords.lng,
          draggable: false,
          isDestination: false,
          photo: this.pet.photo
        });
      }
    }
    
  }

  savePosition() {
    this.showInfo = false;
  }
  

  markerDragEnd(m: marker, $event: MouseEvent) {
    console.log('dragEnd', m, $event);
  }

  changePosition(mPosition: any){
    if(mPosition.isDestination){
      if (this.markers.length > 1) {
        this.generate = false;
        this.markers.splice(-1,1);
      }
    }else{
      if (this.markers.length > 0) {
        this.markers.shift();
      }
    }
    this.showInfo = false;
   
  }

  createRoute(){
    this.generate = true;
    this.showInfoFinal = false;
    this.origin = { lat: this.markers[0].lat, lng: this.markers[0].lng }
    this.destination = { lat: this.markers[1].lat, lng: this.markers[1].lng }

    var directionsService = new google.maps.DirectionsService();
    var haight = new google.maps.LatLng(this.markers[0].lat, this.markers[0].lng);
    var oceanBeach = new google.maps.LatLng(this.markers[1].lat, this.markers[1].lng);
    var request = {
        origin: haight,
        destination: oceanBeach,
        travelMode: google.maps.TravelMode.DRIVING
    };
    directionsService.route(request, (response, status) => {
      if (status == 'OK') {
        this.confirmData = response.routes[0].legs[0]; 
        this.distance = this.confirmData.distance.text;
        this.duration = this.confirmData.duration.text;
        this.end_address = this.confirmData.end_address;
        this.start_address = this.confirmData.start_address;
        
        let costFinal = 1600;
        let endDirection = '<p><b>Dirrecion final:</b>' + this.end_address; + '<br></p>';
        let startDirection = '<p><b>Dirrecion inicial:</b>' + this.start_address; + '<br></p>';
        let distance = '<p><b>Distancia:</b>' + this.distance; + '<br></p>';
        let timeArrival = '<p><b>Tiempo de llegada:</b>' + this.duration + '<br></p>';
        let cost = '<p><b>Costo:</b> ₡' + costFinal + '<br></p>';
        let msg = distance + cost + timeArrival + startDirection + endDirection; 
        
        Swal.fire({
          title: "Confirmación de viaje",
          html: msg,
          showCancelButton: true,
          allowEscapeKey: false,
          confirmButtonText: 'OK',
          cancelButtonText: 'No',
          allowOutsideClick: false,
          buttonsStyling: false,
          reverseButtons: true,
          position: 'top',
          padding: 0,
          customClass: { container: 'sw-leave-container', cancelButton: 'btn btn-warning border col-auto mr-auto p-2', confirmButton: 'col-auto btn btn-info p-2' }
        })
        .then((result) => {
            if (result.value){
              this.trackingRoute = true;
              window.open('https://www.google.com/maps/dir/?api=1&origin='+this.markers[0].lat+','+this.markers[0].lng+'&destination='+this.markers[1].lat+','+this.markers[1].lng+'&travelmode=driving','_blank');
            }

            else
              console.log('somethin happened')
              if(this.trackingRoute){
                this.trackMe();
              }  
        });
      }
    });

  }

  trackMe() {
    this.getTrack = true;
    if (navigator.geolocation) {
      // this.isTracking = true;
      navigator.geolocation.watchPosition((position) => {
        this.showTrackingPosition(position);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  showTrackingPosition(position) {
    // this.currentLat = position.coords.latitude;
    // this.currentLong = position.coords.longitude;

    this.origin = { lat: position.coords.latitude, lng: position.coords.longitude }
    this.destination = { lat: this.markers[1].lat, lng: this.markers[1].lng }
    this.lat = position.coords.latitude;
    this.lng = position.coords.longitude;
    this.zoom = 12;
    
  }

  calcDistance (fromLat, fromLng, toLat, toLng) {
    return google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(fromLat, fromLng), new google.maps.LatLng(toLat, toLng));
  }

  roundToTwo(num) {    
    return num.toFixed(2);
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