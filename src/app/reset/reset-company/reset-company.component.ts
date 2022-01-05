import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PetService } from 'src/app/common/services/pet.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import { Router,ActivatedRoute } from '@angular/router';
import { MustMatch } from '../../common/helpers/must-match.validator';

@Component({
  selector: 'app-reset-company',
  templateUrl: './reset-company.component.html',
  styleUrls: ['./reset-company.component.scss']
})
export class ResetCompanyComponent implements OnInit {

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
        validator: MustMatch('password', 'confirm')
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
      debugger;
      this.petService.resetPassword(reset).subscribe(data => {
        if(data.success) {
          this.loading = false;
          this._notificationSvc.success('Yummy Eats', data.msg, 8000);
        } else {
          this.loading = false;
          this._notificationSvc.warning('Yummy Eats', data.msg, 8000);
        }
      },
      error => {
        this.loading = false;
        this._notificationSvc.warning('Hola', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
      });
    }  

}
