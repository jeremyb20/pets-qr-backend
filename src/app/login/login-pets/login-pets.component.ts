import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { UserState } from 'src/app/common/constants/constants';
import { Router } from '@angular/router';
import { PetService } from 'src/app/common/services/pet.service';

@Component({
  selector: 'app-login-pets',
  templateUrl: './login-pets.component.html',
  styleUrls: ['./login-pets.component.scss']
})
export class LoginPetsComponent implements OnInit {
  public showPassword: boolean;
  loginForm: FormGroup;
  email: string;
  password: string;
  submitted = false;
  loading: boolean = false;
  hideMsg: boolean = false; 
  ShowMsg: string;
  timeSeconds: number =  6000;
  UserState = UserState
  constructor(
    private petService: PetService,
    private formBuilder: FormBuilder,
    private router: Router) { }

  ngOnInit() {
    this.loginForm =  this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }
    this.loading = true;
    const pet = {
      email: this.f.email.value,
      password: this.f.password.value
    }

    this.petService.authenticatePet(pet).subscribe(data => {
      if(data.success) {
        this.loading = false;
        switch (data.pet.userState) {
          case 0:
            this.router.navigate(['/admin']);
            break;
          case 3:
            this.router.navigate(['/dashboard-pet']);
          break;
        
          default:
            break;
        }
        this.petService.storeUserData(data.token, data.pet);
        this.petService.storePrincipalUserData(data.pet);
        this.petService.setidTrack(1)
      } else {
        this.hideMsg = true;
        this.ShowMsg = data.msg;
        this.loading = false;
        setTimeout(() => { this.hideMsg = false }, this.timeSeconds);
      }
    },
    error => {
      this.loading = false;
      this.hideMsg = true;
      this.ShowMsg = 'Servicio en mantenimiento, favor de iniciar sesión más tarde';
      setTimeout(() => { this.hideMsg = false }, 100000);
      console.log(error);
    });
  }
}
