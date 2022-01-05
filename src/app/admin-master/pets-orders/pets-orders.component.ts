import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MediaResponse, MediaService } from 'src/app/common/services/media.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import { PetService } from 'src/app/common/services/pet.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import _ from "lodash";
import {
  AUTO_STYLE,
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';

declare var $: any;

const DEFAULT_DURATION = 300;

@Component({
  selector: 'app-pets-orders',
  templateUrl: './pets-orders.component.html',
  styleUrls: ['./pets-orders.component.scss'],
  animations: [
    trigger('collapse', [
      state('false', style({ height: AUTO_STYLE, visibility: AUTO_STYLE })),
      state('true', style({ height: '0', visibility: 'hidden' })),
      transition('false => true', animate(DEFAULT_DURATION + 'ms ease-in')),
      transition('true => false', animate(DEFAULT_DURATION + 'ms ease-out'))
    ])
  ]
})
export class PetsOrdersComponent implements OnInit {
  private mediaSubscription: Subscription;
  public AngularxQrCode: string = null;
  Media: MediaResponse;
  id: number = 1;
  idTab: number = 1;
  order: any;
  orderHistory: any;
  petLogged: any;
  pet : any;
  showCardMsgOrderList: boolean = false;
  showCardMsgOrderHistoryList: boolean = false;
  loading: boolean = false;


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

    this.getAllCode();
  }

  ngOnInit(): void {
  }
  collapsed = false;
  
  getAllCode(){
    this.petService.getAllCodeList().subscribe(data => {
      this.order = [];
      this.orderHistory = [];
      
      data.forEach(element => {
        if(element.status != 'Recibido'){
          this.order.push(element);
        }else{
          this.orderHistory.push(element);
        }
      });

      this.orderHistory = _.uniqWith(this.orderHistory, (f1,f2) => {
        return f1._id === f2._id;
      });
      this.showCardMsgOrderList = (this.order.length > 0)? false: true;
      this.showCardMsgOrderHistoryList = (this.orderHistory.length > 0)? false: true;
    },
    error => {
    this.loading = false;
    this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor de revisar get all users', 6000);
    });
  }

  showPanel(item: any) {
    item.showPanel = !item.showPanel;
    this.order.map((val, index) => {
      if (val._id != item._id) {
          val.showPanel = true;
      }
    });
    this.orderHistory.map((val, index) => {
      if (val._id != item._id) {
          val.showPanel = true;
      }
    });
  }

  dropdowSelect(state: any, itemPrincipal:any, item: any){
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
                idPetPrincipal: itemPrincipal.idPrincipal,
                idObject: itemPrincipal._id,
                idItemSelected: item._id,
                status: state,
                photo: this.pet.photo
              }
          
              this.petService.updateStatusCodePet(object).subscribe(data => {
                if(data.success) {
                    Swal.fire('Saved!', '', 'success');
                    setTimeout(() => { location.reload(); }, 3000);
                } else {
                  $('#qrCodeInfoDialog').modal('hide');
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

  checkQrCode(link:any){
    $('#qrCodeInfoDialog').modal('show');
    this.AngularxQrCode = link;
  }

  stepButtonOrder(number: any){
    this.idTab = number;
  }
}
