import { Component, ElementRef, NgZone, OnInit, ViewChild,Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MustMatch } from '../../common/helpers/must-match.validator';
import { MapsAPILoader } from '@agm/core';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { PetService } from 'src/app/common/services/pet.service';
declare var $: any;

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget
}

@Component({
  selector: 'app-register-pets',
  templateUrl: './register-pets.component.html',
  styleUrls: ['./register-pets.component.scss']
})
export class RegisterPetComponent implements OnInit {
  @Input() phone;
  proper = false;
  public searchControl: FormControl;
  loading: boolean = false;
  registerForm: FormGroup;
  submitted = false;
  zoom: number = 17;
  lat: number = 9.93040049002793;
  lng: number = -84.09062837772197;
  markers: marker[] = [];
  showInfo: boolean = true;
  hideMsg: boolean = false; 
  getLinkIdParam: null;
  getLinkIdSecondaryParams: null;
  isActivated: boolean;
  ShowMsg: string;
  timeSeconds: number =  6000;
  file : File;
  photoSelected: String | ArrayBuffer;
  bussinesType = [
    {Id: 1, gender: 'Macho'},
    {Id: 2, gender: 'Hembra'}
  ];
  hideInputCode: boolean = false;
  isSetPosition: boolean = false;

  
  constructor(private formBuilder: FormBuilder,private mapsAPILoader: MapsAPILoader,private ngZone: NgZone, private petService: PetService, private router: Router, private route: ActivatedRoute ) {

    if(this.getLinkIdParam == undefined) {
      //Este es cuando va ver perfil;
      this.route.queryParams.subscribe(params => {
        this.getLinkIdParam = params.id;
        this.getLinkIdSecondaryParams = params.idSecond;
        this.isActivated = Boolean(params.isActivated);
        this.hideInputCode = (this.getLinkIdParam == undefined)? true:false;

        if(this.getLinkIdParam == undefined){
          let timerInterval
          Swal.fire({
            title: 'Lo sentimos!',
            html: 'Prece que la ruta que accediste no esta disponible por el momento si tienes alguna duda puedes contactarse con el administrador del sitio. Se enviará al inicio en <b></b> millisegundos.',
            timer: 8000,
            timerProgressBar: true,
            allowOutsideClick: false,
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
      });
    }

   }

  ngOnInit() {
    if(this.hideInputCode){
      this.registerForm = this.formBuilder.group({
        petName: ['', Validators.required],
        genderSelected: ['Género del Can', Validators.required],
        phone: ['', [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        acceptTerms: [false, Validators.requiredTrue]
      }, {
        validator: MustMatch('password', 'confirmPassword')
      });
    }else{
      this.registerForm = this.formBuilder.group({
        petName: ['', Validators.required],
        genderSelected: ['Género del Can', Validators.required],
        phone: ['', [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        codeGenerator: ['', Validators.required],
        acceptTerms: [false, Validators.requiredTrue]
      }, {
        validator: MustMatch('password', 'confirmPassword')
      });
    }
  }

  mapClicked($event: MouseEvent) {
    var event: any;
      event = $event
    this.showInfo = true;
    if (this.markers.length < 1) {
      this.markers.push({
        lat: event.coords.lat,
        lng: event.coords.lng,
        draggable: false,
        photo: 'https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg'
      });
      this.isSetPosition = true;
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
          photo: 'https://cdn.worldvectorlogo.com/logos/google-maps-2020-icon.svg'
        });
        this.showInfo = true;
        this.isSetPosition = true;
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  changePosition(mPosition: any){
    if (this.markers.length > 0) {
      this.markers.shift();
    }
    this.showInfo = false;
    this.isSetPosition = false;
  }

  // convenience getter for easy access to form fields
  get f() { return this.registerForm.controls; }

  savePosition() {
    this.showInfo = false;
  }

  showPoliticPrivacy(){
    $('#termsandcondition').modal('show');
  }

  onSubmit() {
      this.submitted = true;
      // stop here if form is invalid
      if (this.registerForm.invalid) {
          return;
      }
      if(this.f.genderSelected.value  === 'Género del Can'){
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
          html: "Seleccione en el mapa la posición de la vivienda del can",
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
      } else  if(this.file == undefined && !this.showInfo){
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
        if(this.markers.length != 0) {
          if(this.hideInputCode){
            this.loading = true;

            var newPet = {
              petName: this.f.petName.value,
              phone: this.f.phone.value,
              email: this.f.email.value,
              password: this.f.password.value,
              acceptTerms: this.f.acceptTerms.value,
              lat: this.markers[0].lat,
              lng: this.markers[0].lng,
              genderSelected: this.f.genderSelected.value,
              userState: 3,
              petStatus: 'No-Perdido',
            }
    
          this.petService.registerPet(newPet,this.file).subscribe(data => {
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
                    this.router.navigate(['/login-pets']); 
                  }
                    
              });
            } else {
              Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Oops...',
                text: data.msg,
                confirmButtonText: 'OK',
              })
              this.loading = false;
            }
          },
            error => {
              this.hideMsg = true;
              this.loading = false;
              this.ShowMsg = "Ocurrio un error favor contactar a soporte o al administrador del sitio";
              setTimeout(() => { this.hideMsg = false }, this.timeSeconds);
            });
          }else{
            this.loading = true;
            var updateNewPetCode = {
              _id: this.getLinkIdParam,
              idSecond: this.getLinkIdSecondaryParams,
              petName: this.f.petName.value,
              phone: this.f.phone.value,
              email: this.f.email.value,
              password: this.f.password.value,
              acceptTerms: this.f.acceptTerms.value,
              lat: this.markers[0].lat,
              lng: this.markers[0].lng,
              genderSelected: this.f.genderSelected.value,
              userState: 3,
              petStatus: 'No-Perdido',
              codeGenerator: this.f.codeGenerator.value
            }
          this.petService.registerCodePet(updateNewPetCode,this.file).subscribe(data => {
            if(data.success) {
              this.loading = false;
              Swal.fire({
                position: 'center',
                icon: 'success',
                title: 'Registro ' + updateNewPetCode.petName+'',
                html: data.msg,
                confirmButtonText: 'OK',
              })
              .then((result) => {
                  if (result.value){
                    this.router.navigate(['/login-pets']); 
                  }
                    
              });
            } else {
              Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Oops...',
                text: data.msg,
                confirmButtonText: 'OK',
              })
              this.loading = false;
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
  }

  onReset() {
      this.submitted = false;
      this.registerForm.reset();
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


}
interface marker {
	lat: number;
	lng: number;
	label?: string;
  draggable: boolean;
  photo?: any;
}
