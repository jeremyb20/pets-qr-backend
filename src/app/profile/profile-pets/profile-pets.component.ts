import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MediaResponse, MediaService } from 'src/app/common/services/media.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import { PetService } from 'src/app/common/services/pet.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';

declare var $: any;

@Component({
  selector: 'app-profile-pets',
  templateUrl: './profile-pets.component.html',
  styleUrls: ['./profile-pets.component.scss']
})
export class ProfilePetsComponent implements OnInit {
  @Input() age;
  private mediaSubscription: Subscription;
  Media: MediaResponse;

  newPetInfoForm: FormGroup;
  submitted = false;
  loading: boolean = false;
  petLogged: any;
  pet : any;
  profile: any;
  idSecondary: number = 0;
  id: number;
  petPrincipal: any;


  constructor(private petService: PetService,private _notificationSvc: NotificationService,private media: MediaService,private formBuilder: FormBuilder ) { 
    this.petLogged = this.petService.getLocalPet()
    this.pet = JSON.parse(this.petLogged);
    this.idSecondary = this.pet.idSecond;
    var petPrincipal = this.petService.getPrincipalUserData();
    var idSelected = this.petService.getidTrack();
    this.id = parseInt(idSelected);
    this.petPrincipal = JSON.parse(petPrincipal);

    this.mediaSubscription = this.media.subscribeMedia().subscribe(media => {
      this.Media = media;
    });
    this.getPetDataList();
  }

  ngOnInit(): void {
  }

  get g() { return this.newPetInfoForm.controls; }

  getPetDataList() {
    var view = 1;
    this.petService.getPetDataList(this.pet.id, this.idSecondary,view).subscribe(data => {
     if(data.success){
      this.profile = data.pet;
      this.newPetInfoForm = this.formBuilder.group({
        petName: [this.profile.petName, Validators.required],
        ownerPetName: [this.profile.ownerPetName, Validators.required],
        birthDate: [this.profile.birthDate, [Validators.required]],
        phone: [this.profile.phone, [Validators.minLength(8),Validators.required,Validators.pattern(/\d/)]],
        address: [this.profile.address, [Validators.required]],
        email: [this.profile.email, [Validators.required]],
        // email: [{value:this.profile.email, disabled: true}, [Validators.required]],
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
      this.petService.setstoreUserData(objectStored)  
     }else{
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
     }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }


  addNewPetInfoSubmit() {
    this.submitted = true;
    if (this.newPetInfoForm.invalid) {
      return;
    }
    this.loading = true;
    const pet = {
      petName: this.g.petName.value,
      _id: this.pet.id,
      idSecond: this.idSecondary,
      ownerPetName: this.g.ownerPetName.value,
      birthDate: this.g.birthDate.value,
      address: this.g.address.value,
      email: this.g.email.value,
      age: this.g.age.value,
      veterinarianContact: this.g.veterinarianContact.value,
      phone: this.g.phone.value,
      phoneVeterinarian: parseInt(this.g.phoneVeterinarian.value),
      healthAndRequirements: this.g.healthAndRequirements.value,
      favoriteActivities: this.g.favoriteActivities.value,
      linkTwitter: this.g.linkTwitter.value,
      linkFacebook: this.g.linkFacebook.value,
      linkInstagram: this.g.linkInstagram.value
    }

    this.petService.updatePetProfile(pet).subscribe(data => {
      if(data.success) {
        this.loading = false;
        Swal.fire({
          position: 'center',
          icon: 'success',
          title: 'Genial',
          text: data.msg,
          confirmButtonText: 'OK',
        }).then((result) => {
          if (result.isConfirmed) {
            this.getPetDataList();
          }
        })
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
