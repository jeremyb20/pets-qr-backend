import { Component, ElementRef, NgZone, OnInit, ViewChild, OnDestroy, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CalendarOptions } from '@fullcalendar/angular'; // useful for typechecking
import { Subscription, from } from 'rxjs';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { MediaResponse, MediaService } from '../../common/services/media.service';
import { darkStyle, lightStyle } from '../../common/constants/map-theme';
import * as moment from 'moment';
import { PetService } from 'src/app/common/services/pet.service';
import { NewMenuResponse } from './dashboard-company-response'
import { NotificationService } from 'src/app/common/services/notification.service';
import { Router } from '@angular/router';
import esLocale from '@fullcalendar/core/locales/es';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
declare var $: any;
declare const google: any; 

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget
}

@Component({
  selector: 'app-dashboard-company',
  templateUrl: './dashboard-company.component.html',
  styleUrls: ['./dashboard-company.component.scss']
})
export class DashboardCompanyComponent implements OnInit, OnDestroy {
  private mediaSubscription: Subscription;
  @Input() cost;
  newMenuForm: FormGroup;
  newEventForm: FormGroup;
  submitted = false;
  userLogged: any;
  user : any;
  Media: MediaResponse;
  id: number = 1;
  myfoodMenu: NewMenuResponse[] = [];
  showPanelMenuItem:any;
  timeSeconds: number =  6000;
  timeSecondsrestore: number = 1000;
  file : File;
  photoSelected: String | ArrayBuffer;
  showEditMenu: boolean = false;
  loading: boolean = false;
  hideMsg: boolean = false; 
  ShowMsg: string;
  showMenuSelected: boolean = false;
  hideItemSeleccion: boolean = true;
  isNewEvent: boolean = false;
  events: any;
  form = this.formBuilder.group({
    title: [null, Validators.required],
    allDay: [null],
    start: [],
    end: []
  })
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin],
    initialView: 'dayGridMonth',
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next',
      center: '',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Dia',
      list: 'Lista'
    },
    dateClick: this.handleDateClick.bind(this,true), // bind is important!
    events: [
      { title: 'event 1', date: '2020-12-28' },
      { title: 'event 2', date: '2020-12-29' }
    ],
    validRange: {
      start: new Date()
    },
    eventClick: this.handleDateClick.bind(this, false)
  };
  @ViewChild("search")
  public searchElementRef: ElementRef;

  constructor(private petService: PetService, private media: MediaService, private formBuilder: FormBuilder, private _notificationSvc: NotificationService, private router: Router) {
      this.userLogged = this.petService.getLocalPet()
      this.user = JSON.parse(this.userLogged);
      if(this.user != null){
        switch (this.user.userState) {
          case 1:
            this.router.navigate(['/dashboard-user']);
            break;
          case 2:
            this.router.navigate(['/dashboard-driver']);
            break;

          case 3:
            this.router.navigate(['/dashboard-company']);
            break;

          default:
            break;
        }
      }else{
        this.router.navigate(['/home']);
        localStorage.clear();
        return;
      }

      this.mediaSubscription = this.media.subscribeMedia().subscribe(media => {
        this.Media = media;
        if(this.Media.IsLandscape){
          this.showMenuSelected = true;
        }
        if(this.Media.IsMobile){
          this.showMenuSelected = false;
        }
      });

      this.getMyListMenu()
  }

  get f() { return this.newMenuForm.controls; }
  get g() { return this.newEventForm.controls; }

  ngOnInit() {
    this.newMenuForm = this.formBuilder.group({
      foodName: ['', Validators.required],
      cost: ['', [Validators.minLength(3),Validators.required,Validators.pattern(/\d/)]],
      description: ['', Validators.required],
    });

    this.newEventForm = this.formBuilder.group({
      title: ['', Validators.required],
      date: ['', [Validators.required]],
      enddate: ['', Validators.required],
    });
  }

  getMyListMenu(){
    this.showEditMenu = false;
    // this.petService.getMyMenuList(this.user.id).subscribe(data => {
    //   if(data.length>0) {
    //     this.myfoodMenu = data;
    //     this.showPanelMenuItem = this.myfoodMenu.slice(-1).pop();
    //     this.events = [
    //       { title: 'event 3', date: '2020-12-28' },
    //       { title: 'event 4', date: '2020-12-29' }
    //     ]
    //     this.calendarOptions.events = this.events;
    //   }
    // },
    // error => {
    //   $('#newMenuModal').modal('hide');
    //   this._notificationSvc.warning('Hola '+this.user.companyName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    // });
  }

  showPanelMenu(item:any) {
    if(this.Media.IsMobile){
      this.showMenuSelected = true;
      this.hideItemSeleccion = false;
    }
    this.showPanelMenuItem = item;
  }

  goBack() {
    if(this.Media.IsMobile){
      this.showMenuSelected = false;
      this.hideItemSeleccion = true;
    }
  }

  editMenuSelected(item:any) {
    this.showPanelMenuItem = item;
    this.showEditMenu = true;
    this.newMenuForm = this.formBuilder.group({
      foodName: [item.foodName, [Validators.required]],
      cost: [item.cost, [Validators.minLength(3),Validators.required,Validators.pattern(/\d/)]],
      description: [item.description, [Validators.required]],
    });
    $('#newMenuModal').modal('show');
  }

  updateMenuItemSelected(){
    this.submitted = true;
    if (this.newMenuForm.invalid) {
        return;
    }
    this.loading = true;
    var updateItemMenu = {
      foodName: this.f.foodName.value,
      description: this.f.description.value,
      cost: this.f.cost.value,
      idCompany: this.showPanelMenuItem.idCompany,
      _id: this.showPanelMenuItem._id
    }

    this.petService.updateNewMenu(updateItemMenu,this.file).subscribe(data => {
      if(data.success) {
        $('#newMenuModal').modal('hide');
        this._notificationSvc.success('Hola '+this.user.companyName+'', data.msg, 6000);
        this.showEditMenu = false;
        this.loading = false;
        this.newMenuForm = this.formBuilder.group({
          foodName: ['', Validators.required],
          cost: ['', [Validators.minLength(3),Validators.required,Validators.pattern(/\d/)]],
          description: ['', Validators.required],
        });
        this.getMyListMenu();
      } else {
        $('#newMenuModal').modal('hide');
        this._notificationSvc.warning('Hola '+this.user.companyName+'', data.msg, 6000);
      }
    },
    error => {
      this.loading = false;
      $('#newMenuModal').modal('hide');
      this._notificationSvc.warning('Hola '+this.user.companyName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  deleteMenuSelected(item:any) {
    Swal.fire({
      title: 'Eliminar '+item.foodName,
      html: "Estas seguro de eliminar este menu?",
      showCancelButton: true,
      allowEscapeKey: false,
      confirmButtonText: 'OK',
      cancelButtonText: 'No',
      allowOutsideClick: false,
      buttonsStyling: false,
      reverseButtons: true,
      position: 'top',
      padding: 0,
      customClass: { container: 'sw-leave-container', cancelButton: 'btn btn-warning border col-auto mr-auto', confirmButton: 'col-auto btn btn-info' }
    })
    .then((result) => {
        if (result.value){
          this.petService.deleteMenuItem(item).subscribe(data => {
            if(data.success) {
              this._notificationSvc.success('Hola '+this.user.companyName+'', data.msg, 6000);
              if(this.Media.IsMobile){
                this.showMenuSelected = false;
                this.hideItemSeleccion = true;
              }
              setTimeout(() => { this.getMyListMenu(); }, this.timeSecondsrestore);
            } else {
              this._notificationSvc.warning('Hola '+this.user.companyName+'', data.msg, 6000);
            }
          },
          error => {
            $('#newMenuModal').modal('hide');
            this._notificationSvc.warning('Hola '+this.user.companyName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
          });
        }
    });
  }
  
  close(){
    this.showEditMenu = false;
    $('#newMenuModal').modal('hide');
  }
  //Track order ticket

  stepTrackOrder(step: number){
    this.id = step;
  }

  newMenuSubmit() {
    this.submitted = true;
    this.loading = true;
    // stop here if form is invalid
    if (this.newMenuForm.invalid) {
        return;
    }
    var newMenu = {
      foodName: this.f.foodName.value,
      description: this.f.description.value,
      cost: this.f.cost.value,
      idCompany: this.user.id
    }

    // this.petService.registerNewMenu(newMenu,this.file).subscribe(data => {
    //   if(data.success) {
    //     this.loading = false;
    //     $('#newMenuModal').modal('hide');
    //     this._notificationSvc.success('Hola '+this.user.companyName+'', data.msg, 6000);
    //     if(this.Media.IsMobile){
    //       this.showMenuSelected = false;
    //       this.hideItemSeleccion = true;
    //     }
    //     setTimeout(() => { this.getMyListMenu(); }, this.timeSecondsrestore);
    //   } else {
    //     this.loading = false;
    //     $('#newMenuModal').modal('hide');
    //     this._notificationSvc.warning('Hola '+this.user.companyName+'', data.msg, 6000);
    //   }
    // },
    // error => {
    //   $('#newMenuModal').modal('hide');
    //   this.loading = false;
    //   this._notificationSvc.warning('Hola '+this.user.companyName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    // });
  }

  handleDateClick(isNew, arg) {
    $(function(){
      $('[type="date"]').prop('min', function(){
          return new Date().toJSON().split('T')[0];
      });
    });
    this.isNewEvent = isNew;
    if(this.isNewEvent){
      this.newEventForm = this.formBuilder.group({
        title: ['', Validators.required],
        date: [arg.dateStr, [Validators.required]],
        enddate: ['', Validators.required],
      });
    }else{
      var start = moment(arg.event._instance.range.start).format("YYYY-MM-DD");
      var end = moment(arg.event._instance.range.end).format("YYYY-MM-DD");

      this.newEventForm = this.formBuilder.group({
        title: [arg.event._def.title, Validators.required],
        date: [start, [Validators.required]],
        enddate: [end, Validators.required],
      });
    }
    $('#newCalendarEventModal').modal('show');
  }

  newEventCalendarSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.newEventForm.invalid) {
        return;
    }
    this.loading = true;
    var newEvent = {
      title: this.g.title.value,
      date: this.g.date.value,
      enddate: this.g.enddate.value,
      idCompany: this.user.id
    } 
  }

  ngOnDestroy() {
    if(this.mediaSubscription){
      this.mediaSubscription.unsubscribe();
    }
  }

  processFile(event: HtmlInputEvent): void {
    if(event.target.files && event.target.files[0]){
      this.file = <File>event.target.files[0];
      const reader = new FileReader();
      reader.onload = e => this.photoSelected = reader.result;
      reader.readAsDataURL(this.file);
    }
  }
}

