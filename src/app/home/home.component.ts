import { Component, OnInit, HostListener} from '@angular/core';
import { Router } from '@angular/router';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PetService } from '../common/services/pet.service';
import { NotificationService } from '../common/services/notification.service';
import { MediaService, MediaResponse } from '../common/services/media.service';
import { Subscription } from 'rxjs';
declare var $ :any;


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private mediaSubscription: Subscription;
  Media: MediaResponse;
  loginForm: FormGroup;
  email: string;
  password: string;
  submitted = false;
  loading: boolean = false;
  hideMsg: boolean = false; 
  ShowMsg: string;
  timeSeconds: number =  3000;
  query: string;
  allUsersData: any;
  filteredData: any;
  imageUrl: any;
  elementDiv :any
  isShow: boolean;
  topPosToStartShowing = 100;
  year: any;

  constructor(
    private petService: PetService,
    private media: MediaService,
    private _notificationSvc: NotificationService,
    private formBuilder: FormBuilder,
    private router: Router) {
      this.mediaSubscription = this.media.subscribeMedia().subscribe(result => {
        this.Media = result;
      });

      const moonLanding = new Date();
      this.year = moonLanding.getFullYear();
    }

  ngOnInit() {
    this.loginForm =  this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  get f() { return this.loginForm.controls; }

  @HostListener('window:scroll',['$event'])

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
    if(this.elementDiv){
      this.elementDiv.srcElement.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }
    
  }

  showPoliticPrivacy(val) {
    if(val == 1)
      $('#termsandcondition').modal('show');
    else
      $('#politicPrivacy').modal('show');
  }

  customerServicePopup(){
    $('#customerServiceModal').modal('show');
  }

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
        } else {
          this.hideMsg = true;
          this.ShowMsg = data.msg;
          this.loading = false;
          setTimeout(() => { this.hideMsg = false }, this.timeSeconds);
        }
    });
  }

}
