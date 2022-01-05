import { Component, OnInit,ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver-es';
import { Subscription } from 'rxjs';
import { MediaResponse, MediaService } from 'src/app/common/services/media.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import { PetService } from 'src/app/common/services/pet.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';

declare var $: any;


@Component({
  selector: 'app-new-qrpets',
  templateUrl: './new-qrpets.component.html',
  styleUrls: ['./new-qrpets.component.scss']
})
export class NewQRPetsComponent implements OnInit {
  public AngularxQrCode: string = null;
  public textValue: string = null;
  private mediaSubscription: Subscription;
  Media: MediaResponse;
  allNewCodes: any;
  filteredData: any;
  query: any;
  query1: any;
  query2: any;
  petLogged: any;
  pet : any;
  loading: boolean = false;
  submitted = false;
  showPetSecondArray: any;
  isPreparing: any = 0;
  isEnding: any = 0;
  isPending: any = 0;
  isOrdering: any = 0;

  title = 'qr-code-test';
  imgURL = "";
  elem: any;

  @ViewChild('qrCode', {static : false}) qrCode:any;

  constructor(private petService: PetService, private media: MediaService,private _notificationSvc: NotificationService, private router: Router, private formBuilder: FormBuilder) {
    this.petLogged = this.petService.getLocalPet()
    this.pet = JSON.parse(this.petLogged);
    if(this.pet != null){
      //console.log('Se cayo el sistema')
    }else{
      this.router.navigate(['/home']);
      localStorage.clear();
      return;
    }
    this.mediaSubscription = this.media.subscribeMedia().subscribe(media => {
      this.Media = media;
    });
    this.AngularxQrCode = 'Initial QR code data string';
    this.textValue = 'Initial QR code data string';
    this.sortArr('randomCode');
    this.getNewCodes();
  }

  ngOnInit(){
  }



  getNewCodes() {
    this.petService.getNewCodes().subscribe(data => {
        this.isPreparing = 0;
        this.isEnding = 0;
        this.isPending = 0;
        this.isOrdering = 0;
        
        this.allNewCodes = data;
        this.allNewCodes.forEach(element => {
          if(element.stateActivation == 'Preparando'){
            this.isPreparing ++;
          }
          if(element.stateActivation == 'Terminado'){
            this.isEnding ++;
          }
          if(element.stateActivation == 'Pendiente'){
            this.isPending ++;
          }
          if(element.stateActivation == 'Ordenando'){
            this.isOrdering ++;
          }
        });
        this.filteredData = this.allNewCodes;
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor de revisar get all users', 6000);
    });
  }

  checkQrCode(link:any){
    $('#qrCodeInfoDialog').modal('show');
    this.AngularxQrCode = link;
    this.textValue = link;

    setTimeout(() => { this.elem =  this.qrCode.qrcElement.nativeElement.children[0]; 
      let context = this.elem.getContext("2d");
  
      // create image
      let img = new Image();
      img.crossOrigin="anonymous";
      // img.src = this.imgURL;
      img.src = 'https://res.cloudinary.com/ensamble/image/upload/v1619212083/mihxx1tmm5bgjiukmw7r.png'
  
      // fixed sizes
      let iWidth = 70;
      let iHeight = 70;
      
      let _that = this; 
      img.onload = () => {
        context.drawImage(img, (this.elem.width/2) - (iWidth/2),(this.elem.height/2) - (iHeight/2), iWidth, iHeight);    
        // saveAs(_that.canvasToBlob(this.elem), "file.png");
      }
    }, 100);
    // this.createQRWithImage();
  }

  deleteCode(item:any){
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
        this.petService.deletePet(item.idPet).subscribe(data => {
          if(data.success) {
              Swal.fire(
                'Eliminado!',
                'Este usuario ha sido eliminado.',
                'success'
              )
              this.getNewCodes();
              this.loading = false;
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
  
  makeid(length) {
    var result = [];
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result.push(characters.charAt(Math.floor(Math.random() *
        charactersLength)));
    }
    return result.join('');
}

  generateCode() {
    
    var title = 'Agregar Nuevo Codigo?'
    Swal.fire({
        title: title,
        showCancelButton: true,
        confirmButtonText: `Ok`,
      }).then((result) => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
          this.loading = true;
          var newCode = {
            isActivated: true,
            stateActivation: 'Ordenando',
            randomCode: this.makeid(6)
          }
          
          this.petService.registerNewCode(newCode).subscribe(data => {
            if(data.success) {
                Swal.fire(
                  'Resgistrado!',
                  'Se ha registrado nuevo codigo.',
                  'success'
                )
                this.loading = false;
                $('#addNewProductModal').modal('hide');
                this.getNewCodes();
            } else {
              Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Oops...',
                text: 'Ha ocurrido un problema, favor de revisar',
                confirmButtonText: 'OK',
              })
              $('#addNewProductModal').modal('hide');
              this._notificationSvc.warning('Hola '+this.pet.petName+'', data.msg, 6000);
            }
          },
          error => {
            this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
          });

          Swal.fire('Saved!', '', 'success')
        } else if (result.isDenied) {
          Swal.fire('Cambios no ha sido guardados', '', 'info')
        }
      })
    
  }
  sortDir = 1;//1= 'ASE' -1= DSC

  onSortClick(event, sorter: string) {
    let target = event.currentTarget,
      classList = target.classList;

    if (classList.contains('fa-chevron-up')) {
      classList.remove('fa-chevron-up');
      classList.add('fa-chevron-down');
      this.sortDir=-1;
    } else {
      classList.add('fa-chevron-up');
      classList.remove('fa-chevron-down');
      this.sortDir=1;
    }
    this.sortArr(sorter);
  }

  sortArr(colName:any){
    if(this.filteredData){
      if(colName){
        this.filteredData.sort((a, b) => {
          a = a[colName].toLowerCase();
          b = b[colName].toLowerCase();
          return a.localeCompare(b) * this.sortDir;
        });
      }
      
    }
  }

  dropdowSelect(state: any,  item: any){
    var title = 'Cambiar Status?'
    Swal.fire({
        title: title,
        showDenyButton: false,
        showCancelButton: true,
        confirmButtonText: `Ok`,
        denyButtonText: `No cambiar`,
      }).then((result) => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
            var object = {
                idPet: item.idPet,
                status: state,
              }
          
              this.petService.updateStateCodePet(object).subscribe(data => {
                if(data.success) {
                  Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: 'Genial',
                    text: data.msg,
                    confirmButtonText: 'OK',
                  })
                    this.getNewCodes();
                } else {
                  Swal.fire({
                    position: 'center',
                    icon: 'error',
                    title: 'Oops...',
                    text: data.msg,
                    confirmButtonText: 'OK',
                  })
                }
              },
              error => {
                this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
              });

          Swal.fire('Saved!', '', 'success')
        } else if (result.isDenied) {
          Swal.fire('Cambios no ha sido guardados', '', 'info')
        }
      })
  }

  createQRWithImage(){
    // get canvas dom element
    setTimeout(() => { this.elem =  this.qrCode.qrcElement.nativeElement.children[0]; 
      let context = this.elem.getContext("2d");

      // create image
      let img = new Image();
      img.crossOrigin="anonymous";
      // img.src = this.imgURL;
      img.src = 'https://res.cloudinary.com/ensamble/image/upload/v1619212083/mihxx1tmm5bgjiukmw7r.png'

      // fixed sizes
      let iWidth = 70;
      let iHeight = 70;
      
      let _that = this; 
      img.onload = () => {
        context.drawImage(img, (this.elem.width/2) - (iWidth/2),(this.elem.height/2) - (iHeight/2), iWidth, iHeight);    
        saveAs(_that.canvasToBlob(this.elem), "file.png");
      }
    }, 100);
    // convert to canvas type
  }

  // adapted from: https://medium.com/better-programming/convert-a-base64-url-to-image-file-in-angular-4-5796a19fdc21
  canvasToBlob(canvas){
    let dataurl = canvas.toDataURL("image/png");
    let byteString = window.atob(dataurl.replace(/^data:image\/(png|jpg);base64,/, ""));
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const int8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      int8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([int8Array], { type: 'image/jpeg' });
  }

  personalizeCode(){
    $('#qrCodePersonalizedDialog').modal('show');
  }

  filterData(query,query1,query2): any[] {
    if (!query|| !query1 || !query2) {
      this.filteredData = this.allNewCodes;
    }
    
    if(this.filteredData != undefined){
      if(query){
        this.filteredData = this.filteredData.filter(obj => {
            if (!query) {
                return obj;
            }
            return obj.randomCode.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        });
      }

      if(query1){
        this.filteredData = this.filteredData.filter(obj => {
            if (!query1) {
                return obj;
            }
            return obj.link.toLowerCase().indexOf(query1.toLowerCase()) !== -1;
        });
      }

      if(query2){
        this.filteredData = this.filteredData.filter(obj => {
            if (!query2) {
                return obj;
            }
            return obj.idPet.toLowerCase().indexOf(query2.toLowerCase()) !== -1;
        });
      }
    }
    return this.filteredData;
  }
}
