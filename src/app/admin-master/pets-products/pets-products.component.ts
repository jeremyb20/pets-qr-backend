import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MediaResponse, MediaService } from 'src/app/common/services/media.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import { PetService } from 'src/app/common/services/pet.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget
}

declare var $: any;


@Component({
  selector: 'app-pets-products',
  templateUrl: './pets-products.component.html',
  styleUrls: ['./pets-products.component.scss']
})
export class PetsProductsComponent implements OnInit {
  private mediaSubscription: Subscription;
  Media: MediaResponse;

  newProductPetForm: FormGroup;
  isNewProduct: boolean = false;
  loading: boolean = false;
  isfirstPhoto: boolean = false;
  submitted = false;

  idItemProduct: number;
  query2: string;
  linkPhoto: String;
  linkFirst: String;
  linkSecond: String;
  allProductsData: any;
  filteredProductData: any;
  petLogged: any;
  pet : any;
  itemProductSelected: any;
  file : File;
  fileSecond : File;
  photoSelectedSecond: String | ArrayBuffer = null;
  photoSelected: String | ArrayBuffer = null;


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

    this.getAllProductList();
  }

  get f() { return this.newProductPetForm.controls; }


  ngOnInit() {
    this.newProductPetForm = this.formBuilder.group({
      productName: ['', Validators.required],
      size: ['', [Validators.required]],
      color: ['', Validators.required],
      cost: ['', Validators.required],
      quantity:['', Validators.required],
      description: ['', Validators.required],
    });
  }

  getAllProductList() {
    this.petService.getAllShopProductList().subscribe(data => {
        this.allProductsData = data.productsList;
        this.filteredProductData = this.allProductsData;
    },
    error => {
    this.loading = false;
    this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor de revisar All products list', 6000);
    });
  }


  addNewProduct(isNew: boolean,item: any) {
    if(isNew){
      this.newProductPetForm = this.formBuilder.group({
        productName: ['', Validators.required],
        size: ['', [Validators.required]],
        color: ['', Validators.required],
        cost: ['', Validators.required],
        quantity:['', Validators.required],
        description: ['', Validators.required],
      });
       $('#addNewProductModal').modal('show');
       this.isNewProduct = true;
    }else {
      $('#addNewProductModal').modal('show');
      this.isNewProduct = false;
      this.idItemProduct = item._id
      this.newProductPetForm = this.formBuilder.group({
        productName: [item.productName, Validators.required],
        size: [item.size, [Validators.required]],
        color: [item.color, Validators.required],
        cost: [item.cost, Validators.required],
        quantity:[item.quantity, Validators.required],
        description: [item.description, Validators.required],
      });
    }
   
  }

  sendNewProduct(isNewProduct: boolean) {
    this.submitted = true;
    // stop here if form is invalid
    if (this.newProductPetForm.invalid) {
        return;
    }
    
    if(isNewProduct){
      var title = 'Agregar Nuevo Producto?'
      Swal.fire({
          title: title,
          showCancelButton: true,
          confirmButtonText: `Ok`,
        }).then((result) => {
          /* Read more about isConfirmed, isDenied below */
          if (result.isConfirmed) {
            this.loading = true;
            var newProduct = {
              productName: this.f.productName.value,
              size: this.f.size.value,
              color: this.f.color.value,
              cost: this.f.cost.value,
              description: this.f.description.value,
              quantity: this.f.quantity.value,
              id: this.pet.id
            }
            
            this.petService.sendNewProduct(newProduct).subscribe(data => {
              if(data.success) {
                  Swal.fire('Saved!', '', 'success');
                  this.loading = false;
                  $('#addNewProductModal').modal('hide');
                  this.getAllProductList();
              } else {
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
    }else{
      var title = 'Editar Producto?'
      Swal.fire({
          title: title,
          showCancelButton: true,
          confirmButtonText: `Ok`,
        }).then((result) => {
          /* Read more about isConfirmed, isDenied below */
          if (result.isConfirmed) {
            this.loading = true;
            var updateProduct = {
              productName: this.f.productName.value,
              size: this.f.size.value,
              color: this.f.color.value,
              cost: this.f.cost.value,
              description: this.f.description.value,
              quantity: this.f.quantity.value,
              id: this.pet.id,
              idProduct: this.idItemProduct
            }
            this.petService.updateNewProduct(updateProduct).subscribe(data => {
              if(data.success) {
                  Swal.fire('Saved!', '', 'success');
                  this.loading = false;
                  $('#addNewProductModal').modal('hide');
                  this.getAllProductList();
              } else {
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
  }

  sendPhotoSubmit(){
    this.loading = true;
    var object = {
      idProduct:this.itemProductSelected._id,
      isFistPhoto: this.isfirstPhoto,
      image: (this.isfirstPhoto)?this.file:this.fileSecond,
      id: this.pet.id
    }

    this.petService.addPhotoFirstORSecond(object).subscribe(data => {
      if(data.success) {
        $('#addNewFistorSecondPhotoModal').modal('hide');
        this._notificationSvc.success('Hola '+this.pet.petName+'', data.msg, 6000);
        this.getAllProductList();
        this.loading = false;
      } else {
        $('#addNewFistorSecondPhotoModal').modal('hide');
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.pet.petName+'', data.msg, 6000);
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  checkFoto(item:any, value:number){
    this.itemProductSelected = item;
    this.isfirstPhoto = (value == 1)? true: false;
    this.linkPhoto = (value == 1)?item.firstPhoto:item.secondPhoto
    $('#addNewFistorSecondPhotoModal').modal('show');
  }

  seeFoto(item:any){
    this.linkFirst = item.firstPhoto;
    this.linkSecond = item.secondPhoto;
    $('#visualization').modal('show');
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
    return this.filteredProductData;
  }

  processFile(event: HtmlInputEvent): void {

    if(event.target.files && event.target.files[0]){
      this.file = <File>event.target.files[0];

      const reader = new FileReader();

      reader.onload = e => this.photoSelected = reader.result;
      reader.readAsDataURL(this.file);
    }
  }

  processFileSecond(event: HtmlInputEvent): void {

    if(event.target.files && event.target.files[0]){
      this.fileSecond = <File>event.target.files[0];

      const reader = new FileReader();

      reader.onload = e => this.photoSelectedSecond = reader.result;
      reader.readAsDataURL(this.fileSecond);
    }
  }


}
