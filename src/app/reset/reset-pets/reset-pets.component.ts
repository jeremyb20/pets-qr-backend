import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PetService } from 'src/app/common/services/pet.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import { Router,ActivatedRoute } from '@angular/router';
import { MustMatch } from '../../common/helpers/must-match.validator';
import Swal from 'sweetalert2/dist/sweetalert2.js';

@Component({
  selector: 'app-reset-pets',
  templateUrl: './reset-pets.component.html',
  styleUrls: ['./reset-pets.component.scss']
})
export class ResetPetsComponent implements OnInit {
  resetCompanyForm: FormGroup;
  submitted = false;
  loading: boolean = false;
  hideMsg: boolean = false; 
  ShowMsg: string;
  resetToken: null;

  constructor(private formBuilder: FormBuilder, private petService: PetService,private _notificationSvc: NotificationService, private route: ActivatedRoute , private router: Router) {
    this.route.params.subscribe(params => {
      this.resetToken = params.token; 
    });
  }

    ngOnInit(){
      this.resetCompanyForm = this.formBuilder.group({
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirm: ['', Validators.required],
      }, {
        validator: MustMatch('password', 'confirmPassword')
      });
    }

    get f() { return this.resetCompanyForm.controls; }

    onResetPasswordCompanySubmit(){
      this.submitted = true;
      // stop here if form is invalid
      if (this.resetCompanyForm.invalid) {
          return;
      }
      this.loading = true;

      const reset = {
        password: this.f.password.value,
        confirm: this.f.confirm.value,
        token: this.resetToken
      }
      this.petService.resetPassword(reset).subscribe(data => {
        if(data.success) {
          this.loading = false;
          Swal.fire({
            title: 'Cambio de contraseña exitosamente' ,
            html: data.msg,
            showCancelButton: false,
            allowEscapeKey: false,
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            buttonsStyling: false,
            reverseButtons: true,
            position: 'top',
            customClass: { confirmButton: 'col-auto btn btn-info m-3' }
          })
          .then((result) => {
            if (result.value){
              this.router.navigate(['/login-pets']);
            }   
          });
        } else {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: data.msg,
            footer: ''
          }).then((result) => {
            if (result.value){
              this.router.navigate(['/login-pets']);
            }   
          });
        }
      },
      error => {
        this.loading = false;
        this._notificationSvc.warning('Hola', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
      });
    }  

}
