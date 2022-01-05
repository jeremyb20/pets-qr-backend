import { Component, OnInit,ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/angular'; // useful for typechecking
import esLocale from '@fullcalendar/core/locales/es';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import { FullCalendarComponent } from '@fullcalendar/angular';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import * as moment from 'moment';
import { PetService } from 'src/app/common/services/pet.service';
import { NotificationService } from 'src/app/common/services/notification.service';
import Swal from 'sweetalert2/dist/sweetalert2.js';
declare var $: any;


@Component({
  selector: 'app-calendar-pets',
  templateUrl: './calendar-pets.component.html',
  styleUrls: ['./calendar-pets.component.scss']
})
export class CalendarPetsComponent implements OnInit {
  @ViewChild('fullcalendar') fullcalendar: FullCalendarComponent;
  @ViewChild('alert', { read: ElementRef }) alert:ElementRef;

  @ViewChild("search")
  public searchElementRef: ElementRef;

  newEventForm: FormGroup;
  newTokenForm: FormGroup;
  calendarOptions: CalendarOptions = {
    editable: true,
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
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
    events: [],
    eventClick: this.handleDateClick.bind(this, false)
  };

  eventsCalendar: any;
  loading: boolean = false;
  pet : any;
  petLogged: any;
  idSecondary: number = 0;
  id: number;
  petPrincipal: any;
  isNewEvent: boolean = false;
  isNewGoogleEvent: boolean = false;
  submitted = false;
  idEventUpdate: any;
  calendarObject : any;
  token: string;
  showtoken:  boolean = false;
  idEvent: any;

  constructor(private petService: PetService,private _notificationSvc: NotificationService,private formBuilder: FormBuilder,) {
    this.petLogged = this.petService.getLocalPet()
    this.pet = JSON.parse(this.petLogged);
    this.idSecondary = this.pet.idSecond;
    var petPrincipal = this.petService.getPrincipalUserData();
    var idSelected = this.petService.getidTrack();
    this.id = parseInt(idSelected);
    this.petPrincipal = JSON.parse(petPrincipal);
    this.getCalendarInfo();
   }

   ngAfterViewInit() {
    new Draggable(this.alert.nativeElement, {
      itemSelector: '.fc-event',
    });
  }

  ngOnInit() {
    this.newEventForm = this.formBuilder.group({
      title: ['', Validators.required],
      date: ['', [Validators.required]],
      enddate: ['', Validators.required],
      description: ['', Validators.required],
    });

    this.newTokenForm = this.formBuilder.group({
      token: ['', Validators.required],
    });
  }

  eventDragStop(model) {
    // console.log(model);
  }

  get f() { return this.newEventForm.controls; }
  get t() { return this.newTokenForm.controls; }

  getCalendarInfo() {
    this.petService.getCalendarInfoService(this.pet.id, this.idSecondary).subscribe(data => {
      this.calendarOptions.events = data.calendar;
      this.eventsCalendar = data.calendar;
      if(data.token){
        this.token = data.token;
        this.showtoken = true;
        this.authenticateGoogleApi();
      }else{
          this.isNewGoogleEvent = false;
          this.isNewEvent = true;
      }
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

  handleDateClick(isNew, arg) {
    $(function(){
      $('[type="date"]').prop('min', function(){
          return new Date().toJSON().split('T')[0];
      });
    });
    if(this.token){
      this.isNewGoogleEvent = isNew;
      if(arg.event){
        this.idEvent = arg.event._def.publicId;
      }
      
      if(this.isNewGoogleEvent){
        this.newEventForm = this.formBuilder.group({
          title: ['', Validators.required],
          date: [arg.dateStr, [Validators.required]],
          enddate: ['', Validators.required],
          description: ['', Validators.required],
        });
      }else{
        var start = moment(arg.event._instance.range.end).format("YYYY-MM-DD");
        // var end = arg.event._def.extendedProps.enddate;
  
        this.newEventForm = this.formBuilder.group({
          title: [arg.event._def.title, Validators.required],
          date: [start, [Validators.required]],
          enddate: [arg.event._def.extendedProps.enddate, Validators.required],
          description: [arg.event._def.extendedProps.description, Validators.required],
        });
      }
      $('#newGoogleCalendarEventModal').modal('show');
    }else{
      this.isNewEvent = isNew;
      if(this.isNewEvent){
        this.newEventForm = this.formBuilder.group({
          title: ['', Validators.required],
          date: [arg.dateStr, [Validators.required]],
          enddate: ['', Validators.required],
          description: ['', Validators.required],
        });
      }else{
        var start = moment(arg.event._instance.range.end).format("YYYY-MM-DD");
        this.idEventUpdate = arg.event._def.extendedProps._id;
        this.newEventForm = this.formBuilder.group({
          title: [arg.event._def.title, Validators.required],
          date: [start, [Validators.required]],
          enddate: [arg.event._def.extendedProps.enddate, Validators.required],
          description: [arg.event._def.extendedProps.description, Validators.required],
        });
      }
      $('#newCalendarEventModal').modal('show');
    }
  }

  showEventGoogle(){
    $('#newGoogleCalendarEventModal').modal('show');
  }

  showEvent(){
    // this.isNewEvent = true;
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
      title: this.f.title.value,
      date: this.f.date.value,
      enddate: this.f.enddate.value,
      description: this.f.description.value,
      _id: this.pet.id,
      idSecond: this.idSecondary
    } 

    if(newEvent.date>newEvent.enddate){
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'Oops...',
        text: 'Revise que las fechas esten correctamente seleccionadas',
        confirmButtonText: 'OK',
      })

      this.loading = false;

      return;
    }else{
      this.petService.registerNewPetEvent(newEvent).subscribe(data => {
        if(data.success) {
          $('#newCalendarEventModal').modal('hide');
          this._notificationSvc.success('Hola '+this.pet.petName+'', data.msg, 6000);
          this.loading = false;
          this.getCalendarInfo();
        } else {
          $('#newCalendarEventModal').modal('hide');
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


  showPopupGoogle(){
    $('#showgoogleModal').modal('show');
  }

  authenticateGoogleApi() {
    if(!this.token){
      this.submitted = true;
      // stop here if form is invalid
      if (this.newTokenForm.invalid) {
          return;
      }
      this.loading = true;
      if(this.t.token.value){

      }
    }

    var newToken = {
      token: (this.t.token.value)? this.t.token.value: this.token,
      _id: this.pet.id
    } 

    this.petService.authenticateGoogleToken(newToken).subscribe(data => {
      
      if(data.success) {
        this.loading = false;
        this.showtoken = true;
        this.isNewGoogleEvent = true;
        this.isNewEvent = false;

        this.calendarObject =[];
        $('#showgoogleModal').modal('hide');
        data.events.forEach(element => {
          if(element){
            var test = {
              title: element.summary,
              date: (element.start.date)? element.start.date: moment(element.start.dateTime).format("YYYY-MM-DD"),
              enddate: (element.end.date)? element.end.date: moment(element.end.dateTime).format("YYYY-MM-DD"),
              description: element.description,
              id: element.id,
            }

            this.calendarObject.push(test);
          }
        });

        this.calendarOptions.events = this.calendarObject;
        
        this.newTokenForm.reset();
      } else if(data.status == 200) {

        let timerInterval
        Swal.fire({
          title: data.msg,
          html: 'Cerrara en  <b></b> millisegundos.',
          timer: 2000,
          timerProgressBar: true,
          didOpen: () => {
            Swal.showLoading()
            timerInterval = setInterval(() => {
              const content = Swal.getContent()
              if (content) {
                const b = content.querySelector('b')
                if (b) {
                  b.textContent = Swal.getTimerLeft()
                }
              }
            }, 100)
          },
          willClose: () => {
            clearInterval(timerInterval)
          }
        }).then((result) => {
          /* Read more about handling dismissals below */
          if (result.dismiss === Swal.DismissReason.timer) {
            this.authenticateGoogleApi();
            location.reload();
          }
        })

      }else{
        this.loading = false;
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
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
    
  }

  deleteGoogleEvent(){

    Swal.fire({
      title: 'Estas seguro?',
      text: "No seras capaz de revertir esta accion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar Evento!'
    }).then((result) => {
      if (result.isConfirmed) {
        var removeEvent = {
          eventId: this.idEvent
        } 
        this.petService.removeGoogleEvent(removeEvent).subscribe(data => {
          if(data.success) {
            this.loading = false;
            Swal.fire({
              position: 'center',
              icon: 'success',
              title: 'Genial',
              text: data.msg,
              confirmButtonText: 'OK',
            })
            this.authenticateGoogleApi();
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
          this.loading = false;
          this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
        });
      }
    })
  }

  closeSesion(){

    Swal.fire({
      title: 'Estas seguro?',
      text: "No seras capaz de revertir esta accion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Cerrar sesion!'
    }).then((result) => {
      if (result.isConfirmed) {
        var newToken = {
          token: this.token,
          _id: this.pet.id
        } 
        this.petService.closeGoogleToken(newToken).subscribe(data => {
          if(data.success) {
            this.loading = false;
            this.showtoken = false;
            this.isNewGoogleEvent = false;
            Swal.fire({
              position: 'center',
              icon: 'success',
              title: 'Genial',
              text: data.msg,
              confirmButtonText: 'OK',
            }).then((result) => {
              if (result.isConfirmed) {
                location.reload();
              }
            })
            
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
          this.loading = false;
          this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
        });
      }
    })

  }

  sendEventGoogle(){
    this.submitted = true;
    // stop here if form is invalid
    if (this.newEventForm.invalid) {
        return;
    }
    this.loading = true;

    var today = moment(new Date()).format("YYYY-MM-DD");

    var fecha1 = moment(this.f.date.value);
    var fecha2 = moment(this.f.enddate.value);

    var newEventGoogle = {
      title: this.f.title.value,
      date: fecha1.diff(today, 'days'),
      enddate: fecha2.diff(today, 'days'),
      description: this.f.description.value
    } 

    if(newEventGoogle.date>newEventGoogle.enddate){
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'Oops...',
        text: 'Revise que las fechas esten correctamente seleccionadas',
        confirmButtonText: 'OK',
      })

      this.loading = false;

      return;
    }else{
      this.petService.sendEventGoogleCalendar(newEventGoogle).subscribe(data => {
        if(data.success) {
          this.loading = false;
          $('#newGoogleCalendarEventModal').modal('hide');
          Swal.fire({
            position: 'center',
            icon: 'success',
            title: 'Genial...',
            text: data.msg,
            confirmButtonText: 'OK',
          })
  
          this.authenticateGoogleApi();
        } else {
          this.loading = false;
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
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
      });
    }
  }

  sendEditEventGoogle() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.newEventForm.invalid) {
        return;
    }
    this.loading = true;

    var today = moment(new Date()).format("YYYY-MM-DD");

    var fecha1 = moment(this.f.date.value);
    var fecha2 = moment(this.f.enddate.value);

    var editEventGoogle = {
      title: this.f.title.value,
      date: fecha1.diff(today, 'days'),
      enddate: fecha2.diff(today, 'days'),
      description: this.f.description.value,
      eventId: this.idEvent
    } 

    if(editEventGoogle.date>editEventGoogle.enddate){
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'Oops...',
        text: 'Revise que las fechas esten correctamente seleccionadas',
        confirmButtonText: 'OK',
      })

      this.loading = false;

      return;
    }else{
      this.petService.editEventGoogleCalendar(editEventGoogle).subscribe(data => {
        if(data.success) {
          this.loading = false;
          $('#newGoogleCalendarEventModal').modal('hide');
          Swal.fire({
            position: 'center',
            icon: 'success',
            title: 'Genial...',
            text: data.msg,
            confirmButtonText: 'OK',
          })
  
          this.authenticateGoogleApi();
        } else {
          this.loading = false;
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
        this.loading = false;
        this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
      });
    }
  }

  updateEventCalendarSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.newEventForm.invalid) {
        return;
    }
    this.loading = true;
    var updateEvent = {
      title: this.f.title.value,
      date: this.f.date.value,
      enddate: this.f.enddate.value,
      description: this.f.description.value,
      idEventUpdate: this.idEventUpdate,
      _id: this.pet.id,
      idSecond: this.idSecondary,
    } 

    if(updateEvent.date>updateEvent.enddate){
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'Oops...',
        text: 'Revise que las fechas esten correctamente seleccionadas',
        confirmButtonText: 'OK',
      })

      this.loading = false;

      return;
    }else{
      this.petService.updateNewPetEvent(updateEvent).subscribe(data => {
        if (data.success) {
          $('#newCalendarEventModal').modal('hide');
          this._notificationSvc.success('Hola ' + this.pet.petName + '', data.msg, 6000);
          this.loading = false;
          location.reload();
        } else {
          $('#newCalendarEventModal').modal('hide');
          this.loading = false;
          this._notificationSvc.warning('Hola ' + this.pet.petName + '', data.msg, 6000);
        }
      },
        error => {
          this.loading = false;
          this._notificationSvc.warning('Hola ' + this.pet.petName + '', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
        });
    }
   
  }

  deleteEvent(){

    Swal.fire({
      title: 'Estas seguro?',
      text: "No seras capaz de revertir esta accion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar Evento!'
    }).then((result) => {
      if (result.isConfirmed) {
        var removeEvent = {
          idEventUpdate: this.idEventUpdate,
          _id: this.pet.id,
        } 
        this.petService.removeEvent(removeEvent).subscribe(data => {
          if(data.success) {
            this.loading = false;
            Swal.fire({
              position: 'center',
              icon: 'success',
              title: 'Genial',
              text: data.msg,
              confirmButtonText: 'OK',
            })
            this.getCalendarInfo();
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
          this.loading = false;
          this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
        });
      }
    })
  }

}
