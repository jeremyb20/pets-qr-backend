import { Component, OnInit ,Input} from '@angular/core';
import { AuthServices } from '../common/services/auth.service';
import { PetService } from '../common/services/pet.service';
import { NotificationService } from '../common/services/notification.service';
import { MediaService, MediaResponse } from '../common/services/media.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
declare var $ :any;
declare var window: any;

@Component({
  selector: 'app-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  styleUrls: ['./shopping-cart.component.scss']
})
export class ShoppingCartComponent implements OnInit {
  private mediaSubscription: Subscription;
  buyProcudForm: FormGroup;
  Media: MediaResponse;
  submitted: boolean= false;
  userLogged: any;
  user:any;
  loading: boolean = false;
  profile: any;
  shoppingCartList: any;
  allProductsData: any;
  filteredProductData: any;
  query2: string;
  showNoProductFound: boolean = false;
  counter: number = 0;
  allListShoppingCartItem = [];
  finalCard: any;
  test: any;
  loadingQr: boolean = false;
  total: number;
  phoneSinpe: string = '70160434';
  @Input() products: any = [];
  photoPrincipalPet: string;
  seeAllProfile: any;
  petPrincipal: any;
  selectCanObject:any;
  productNameSelected: any;
  petNamePrincipal: string = '';
  linkFirst: String;
  linkSecond: String;
  historyList : any = [];
  private singleProduct;
  public isAdded;

  constructor(public authService: AuthServices, public petService: PetService,private formBuilder: FormBuilder, private _notificationSvc: NotificationService, private media: MediaService,private route: Router) {
    this.mediaSubscription = this.media.subscribeMedia().subscribe(result => {
      this.Media = result;
    });
    this.userLogged = this.authService.getLocalUser();
    if(this.userLogged == null ){
        this.userLogged = this.petService.getLocalPet();
    }
    this.user = JSON.parse(this.userLogged);
    var petPrincipal = this.petService.getPrincipalUserData();
    this.petPrincipal = JSON.parse(petPrincipal);
    this.getAllMyProduct();
  }

  ngOnInit() {
    this.buyProcudForm = this.formBuilder.group({
      comment: ['', Validators.required],
    });

    this.petService.getAllProfileList(this.petPrincipal.id).subscribe(data => {
      this.photoPrincipalPet = data.photo;
      this.petNamePrincipal = data.petName
      this.seeAllProfile = data.newPetProfile;
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.user.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  get h() { return this.buyProcudForm.controls; }

  getAllMyProduct(){
    this.petService.getAllShopProductList().subscribe(data => {
      if(data){
        this.allProductsData = data.productsList;
        this.filteredProductData = this.allProductsData;
        
        this.getHistory();
      }else{
        console.log(data);
      }
      
    },
    error => {
    this.loading = false;
    this._notificationSvc.warning('Hola '+'Lo sentimos.'+'', 'Ocurrio un error favor Contactar al administrador', 6000);
    });
  }

  getHistory(){
    this.petService.getHistoryList(this.petPrincipal.id).subscribe(data => {
     this.historyList = data;
    },
    error => {
    this.loading = false;
    this._notificationSvc.warning('Hola '+this.user.petName+'', 'Ocurrio un error favor Contactar al administrador', 6000);
    });
  }

  addToShoppingCart(event, item:any){

    // If Item is already added then display alert message
    if (event.target.classList.contains('btn-success')) { 
      Swal.fire({
        position: 'top',
        icon: 'error',
        title: 'Oops...',
        text: 'Este producto ya esta dentro del carrito!'
      })
      return false;
    }

    // Change button color to green
    this.allProductsData.map((val, index) => {
      if (val._id === item._id) {
        item.class = 'btn-success';
      }
    })
  
    this.allListShoppingCartItem.push(item);
    this.finalCard = this.allListShoppingCartItem.filter((item, i, ar) => ar.indexOf(item) === i);
    this.counter = this.finalCard.length;
  }

  seeFoto(item:any){
    this.linkFirst = item.firstPhoto;
    this.linkSecond = item.secondPhoto;
    $('#visualization').modal('show');
  }

  disMarkItem(item) {
    
    var title = 'Eliminar '+item.productName+' del carrito ?'
    Swal.fire({
        title: title,
        showCancelButton: true,
        confirmButtonText: `Ok`,
      }).then((result) => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
            this.allProductsData.map((val, index) => {
              if (val.class === item.class) {
                item.class = '';
              }
            })
        
            var index = this.finalCard.indexOf(item);
            if (index !== -1) {
              this.finalCard.splice(index, 1);
            }
            this.allListShoppingCartItem =  this.finalCard;
            this.counter = this.finalCard.length;

        }
      })
  }

  removeItem(item){
    this.test = [];
    var index = this.finalCard.indexOf(item);
    if(this.selectCanObject){
      var indexSecond = this.selectCanObject.indexOf(item);
      if (indexSecond !== -1) {
        this.selectCanObject.splice(indexSecond, 1);
      }
    }
    if (index !== -1) {
      this.finalCard.splice(index, 1);
    }

    this.allListShoppingCartItem = this.finalCard;

    this.allProductsData.map((val, index) => {
      if (val._id === item._id) {
        item.class = '';
      }
    })
    
    this.finalCard.forEach(element => {
      this.test.push(parseInt(element.cost));
    });
    this.total = this.test.reduce((sum, p) => sum + p, 0)

    this.counter = this.finalCard.length;
  }

  filterProductData(query2): any[] {
    if (!query2) {
      this.filteredProductData = this.allProductsData;
    }
    
    if(this.filteredProductData != undefined){
        this.filteredProductData = this.filteredProductData.filter(obj => {
          if (!query2) {
              return obj;
          }
          return obj.productName.toLowerCase().indexOf(query2.toLowerCase()) !== -1;
      });
    }
    if(this.filteredProductData != undefined)
      this.showNoProductFound = (this.filteredProductData.length == 0)? true: false
    return this.filteredProductData;
}

  checkMyShoppingCart(){
    $('#checkMyShoppingCartModal').modal('show');
    this.test = []
    this.finalCard.forEach(element => {
      this.test.push(parseInt(element.cost));
    });
    this.total = this.test.reduce((sum, p) => sum + p, 0)
  }

  goToPay() {
    var goNext = false;
    this.finalCard.forEach(element => {
      if(element.petName == undefined){
        // If Item is already added then display alert message
        Swal.fire({
          position: 'top',
          icon: 'error',
          title: 'Oops...',
          text: 'El producto ' +element.productName+ ' debe ser seleccionado para un can!'
        })
        goNext = false;
        return;
      }else{
        goNext = true;
      }
    });
    if(goNext)
    $('#goToPayModal').modal('show');
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
    document.addEventListener('copy', (e: ClipboardEvent) => {
      e.clipboardData.setData('text/plain', (this.phoneSinpe));
      e.preventDefault();
      document.removeEventListener('copy', null);
    });
    document.execCommand('copy');
  }

  selectCan(item: any) {
    this.productNameSelected = item.productName;
    this.selectCanObject = [];
    this.selectCanObject.push(item);
    $('#selectProfileModal').modal('show');
  }

  profileSelected(val:any){
    this.finalCard.forEach(element => {
      if(element.productName == this.productNameSelected){
        element.idCan = val.id,
        element.petName = val.petName,
        element.petPhoto = val.photo
      }
    });
    $('#selectProfileModal').modal('hide');
  }


  generateQrCode() {
    this.submitted = true;
    if (this.buyProcudForm.invalid) {
      return;
    }
    this.loadingQr = true;
   
    let products = [];
    this.finalCard.forEach(element => {
      var intermediate = {
        idPrincipal: this.petPrincipal.id,
        email: this.petPrincipal.email,
        comment: this.h.comment.value,
        productName: element.productName,
        description:element.description,
        cost: element.cost,
        idCan: element.idCan,
        petName: element.petName,
        petPhoto: element.petPhoto,
        status: "Ordenando",
      }
      products.push(intermediate)
    });

    var object = {
      idPrincipal: this.petPrincipal.id,
      products: products
    }

    // var object = {
    //   idPrincipal: this.petPrincipal.id,
    //   petName: this.petPrincipal.petName,
    //   photo: this.petPrincipal.photo,
    //   email: this.petPrincipal.email,
    //   comment: this.h.comment.value,
    //   products : products,
    //   total: this.total
    // }

    this.petService.generateQrCodePet(object).subscribe(data => {
      if(data.success) {
        Swal.fire({
          title: 'Compra de producto exitoso' ,
          html: data.msg,
          icon: "success",
          allowEscapeKey: false,
          allowOutsideClick: false,
          position: 'top',
          customClass: { confirmButton: 'col-auto btn btn-info' }
        })
        .then((result) => {
          if (result.value){
            this.loadingQr = true;
            $('#goToPayModal').modal('hide');
            setTimeout(() => { this.route.navigate(['/dashboard-pet']); }, 3000);
            location.reload();
          }   
        });
      } else {
        $('#goToPayModal').modal('hide');
        this.loadingQr = false;
        this._notificationSvc.warning('Hola '+this.user.petName+'', data.msg, 6000);
      }
    },
    error => {
      this.loadingQr = false;
      this._notificationSvc.warning('Hola '+this.user.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  historyCart(){
    $('#showHistoryModal').modal('show');
  }


}
