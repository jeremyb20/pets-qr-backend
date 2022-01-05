import { Component, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators,FormControl } from '@angular/forms';

import { PetService } from 'src/app/common/services/pet.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import { Router,ActivatedRoute } from '@angular/router';
import { MediaResponse, MediaService } from '../common/services/media.service';
import { darkStyle, lightStyle } from '../common/constants/map-theme';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { MapsAPILoader } from '@agm/core';
import {Location} from '@angular/common';
import { Subscription } from 'rxjs';

declare var $ :any

@Component({
  selector: 'app-my-pet-code',
  templateUrl: './my-pet-code.component.html',
  styleUrls: ['./my-pet-code.component.scss']
})
export class MyPetCodeComponent implements OnInit {
  private mediaSubscription: Subscription;
  public searchControl: FormControl;
  getLinkIdParam: null;
  getLinkIdSecondaryParams: null;
  zoom: number = 12;
  lat: number = 9.93040049002793;
  lng: number = -84.09062837772197;
  markers: marker[] = [];
  gomarkers: gomarker[] = []
  profile: any;
  showInfo: boolean = false;
  loading: boolean = false;
  imageUrl: any;
  Media: MediaResponse;
  hideMenu: boolean = false;
  currentTimer: any;
  permissionData: any;
  profileUrl: String;
  // map 
  showInfoFinal: boolean = false;
  addDestiny: boolean = false;
  generate: boolean = false;
  origin : any;
  destination : any;
  getTrack: boolean = false;

  isShow: boolean;
  topPosToStartShowing = 100;
  elementDiv :any
  view = 0;

  @ViewChild("search")
  public searchElementRef: ElementRef;

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

  constructor(private formBuilder: FormBuilder, private media: MediaService, private mapsAPILoader: MapsAPILoader, private ngZone: NgZone,  private petService: PetService,private _notificationSvc: NotificationService, private route: ActivatedRoute , private router: Router) {
    this.route.params.subscribe(params => {
      // este es cuando hace click en target_blank
      this.getLinkIdParam = params.id; 
      this.getLinkIdSecondaryParams = params.idSecond;
      this.view = 3;
    });

    if(this.getLinkIdParam == undefined) {
      //Este es cuando va ver perfil;
      this.route.queryParams.subscribe(params => {
        this.getLinkIdParam = params.id;
        this.getLinkIdSecondaryParams = params.idSecond;
        this.hideMenu = true;
        this.view = 2;
      });
    }
    
    this.mediaSubscription = this.media.subscribeMedia().subscribe(media => {
      this.Media = media;
    });

    var today = new Date()
    var curHr = today.getHours()
    
    if (curHr < 12) {
      this.currentTimer = lightStyle;
    } else if (curHr < 18) {
      this.currentTimer = darkStyle;
    } else {
      this.currentTimer = darkStyle;
    }
    this.getPetDataList();
   
   }

  ngOnInit() {}

  getPetDataList() {
    this.petService.getPetDataList(this.getLinkIdParam,this.getLinkIdSecondaryParams, this.view).subscribe(data => {
      if(data.success){
        if(data.pet.isActivated){
         // this.router.navigate(['/register-pets']); 
          this.router.navigate(['/register-pets/'],{ queryParams: {id: this.getLinkIdParam, idSecond: this.getLinkIdSecondaryParams, isActivated:data.pet.isActivated}}); 

        }else{
          this.profile = data.pet;
          this.imageUrl = this.profile.photo;
          this.markers.push({
            lat: this.profile.lat,
            lng: this.profile.lng,
            draggable: false,
            isDestination: true,
            photo: 'https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg'
          });
          this.getPermissionInfo();
          this.showInfo = true;
        }
      }else {
        let timerInterval
        Swal.fire({
          title: 'Error de enrutamiento!',
          html: 'Prece que id que accediste esta roto o no existe. Se enviará al inicio en <b></b> millisegundos.',
          timer: 4000,
          timerProgressBar: true,
          didOpen: () => {
            Swal.showLoading()
            timerInterval = setInterval(() => {
              const content = Swal.getContent()
              if (content) {
                const b = content.querySelector('b')
                if (b) {
                  b.textContent = Swal.getTimerLeft()
                }
              }
            }, 100)
          },
          willClose: () => {
            clearInterval(timerInterval)
          }
        }).then((result) => {
          /* Read more about handling dismissals below */
          if (result.dismiss === Swal.DismissReason.timer) {
            this.router.navigate(['/home']); 
          }
        })
      }
    },
    error => {
      this.loading = false;
      let timerInterval
      Swal.fire({
        title: 'Error de enrutamiento!',
        html: 'Prece que el link no está disponible. Se enviará al inicio en <b></b> millisegundos.',
        timer: 4000,
        timerProgressBar: true,
        didOpen: () => {
          Swal.showLoading()
          timerInterval = setInterval(() => {
            const content = Swal.getContent()
            if (content) {
              const b = content.querySelector('b')
              if (b) {
                b.textContent = Swal.getTimerLeft()
              }
            }
          }, 100)
        },
        willClose: () => {
          clearInterval(timerInterval)
        }
      }).then((result) => {
        /* Read more about handling dismissals below */
        if (result.dismiss === Swal.DismissReason.timer) {
          this.router.navigate(['/home']); 
        }
      })
    
    });
  }

  getPermissionInfo() {
    this.petService.getPetPermissionsDataList(this.getLinkIdParam, this.getLinkIdSecondaryParams).subscribe(data => {
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
          showLocationInfo: true
        }
      }else{
        this.permissionData = data.permissions[0];
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.profile.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }


  copyInputMessage(inputElement:any){
    Swal.fire({
      position: 'top-end',
      width: 300,
      icon: 'success',
      title: 'Copiado al portapapeles',
      showConfirmButton: false,
      timer: 1500
    })

	  let selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = inputElement;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);

    
  }
  
  showPopupMapPetHome() {
    $('#showPopupMapPetHome').modal('show');
    this. setCurrentPosition();
  }

  profileModal(link){
    $('#visualization').modal('show');
    this.profileUrl = link
  }

  setCurrentPosition() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.zoom = 17;

        this.gomarkers.push({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          draggable: false,
          isDestination: false,
          photo: 'https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg'
        });
        this.showInfo = true;
        this.addDestiny = false;
        this.generate = false;
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  changePosition(mPosition: any){
    this.gomarkers.shift();
    this.showInfo = false;
   
  }

  mapClicked($event: MouseEvent) {
    var event: any;
      event = $event
    this.showInfo = true;
    if(this.gomarkers.length <= 0){
      this.gomarkers.push({
        lat: event.coords.lat,
        lng: event.coords.lng,
        draggable: false,
        isDestination: false,
        photo: 'https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg'
      });
      this.generate = true;
    }
  }

  createRoute(){
    this.generate = true;
    this.origin = { lat: parseFloat(String(this.gomarkers[0].lat)), lng: parseFloat(String(this.gomarkers[0].lng)) }
    this.destination = { lat: parseFloat(String(this.markers[0].lat)), lng: parseFloat(String(this.markers[0].lng)) }

    var directionsService = new google.maps.DirectionsService();
    var haight = new google.maps.LatLng(this.gomarkers[0].lat, this.gomarkers[0].lng);
    var oceanBeach = new google.maps.LatLng(this.markers[0].lat, this.markers[0].lng);
    var request = {
        origin: haight,
        destination: oceanBeach,
        travelMode: google.maps.TravelMode.DRIVING
    };
    directionsService.route(request, (response, status) => {
      if (status == 'OK') {
        Swal.fire({
          title: 'Seleccione su aplicacion de preferencia',
          showDenyButton: true,
          position: 'top',
          showCloseButton: true,
          showCancelButton: false,
          confirmButtonText: '<img alt="waze" style="height:100px;" src="https://res.cloudinary.com/ensamble/image/upload/v1612996625/waze-logo-0_hubxqp.png">',
          denyButtonText: '<img alt="waze" style="height:100px;" src="https://res.cloudinary.com/ensamble/image/upload/v1612996625/google_maps_icon_130921_ei3tpw.png">',
        }).then((result) => {
          /* Read more about isConfirmed, isDenied below */
          if (result.isConfirmed) {
            let toLat = this.markers[0].lat;
            let toLong = this.markers[0].lng;

            let destination = toLat + ',' + toLong;

            window.open('https://waze.com/ul?ll=' + destination + '&z=10', '_blank');
          } else if (result.isDenied) {
            window.open('https://www.google.com/maps/dir/?api=1&origin='+this.gomarkers[0].lat+','+this.gomarkers[0].lng+'&destination='+this.markers[0].lat+','+this.markers[0].lng+'&travelmode=driving','_blank');
          }
          this.zoom = 12;
          this.showInfo = true;
          location.reload();
          $('#showPopupMapPetHome').modal('hide');
        })
      }else {
        this.showInfo = true;
        $('#showPopupMapPetHome').modal('hide');
      }
    });
  }

  customerServicePopup(){
    $('#customerServiceModal').modal('show');
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

}
interface marker {
	lat: number;
	lng: number;
	label?: string;
  draggable: boolean;
  isDestination?: boolean;
  photo?: any;
}

interface gomarker {
	lat: number;
	lng: number;
	label?: string;
  draggable: boolean;
  isDestination?: boolean;
  photo?: any;
}
