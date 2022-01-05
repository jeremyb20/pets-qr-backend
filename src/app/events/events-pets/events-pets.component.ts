import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { NotificationService } from 'src/app/common/services/notification.service';
import { PetService } from 'src/app/common/services/pet.service';

declare var $: any;

@Component({
  selector: 'app-events-pets',
  templateUrl: './events-pets.component.html',
  styleUrls: ['./events-pets.component.scss']
})
export class EventsPetsComponent implements OnInit {
  newEventForm: FormGroup;
  eventsCalendar: any;
  loading: boolean = false;
  pet : any;
  petLogged: any;
  idSecondary: number = 0;
  id: number;
  petPrincipal: any;
  isNewEvent: boolean = false;
  submitted = false;
  idEventUpdate: any;

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

  ngOnInit() {
    this.newEventForm = this.formBuilder.group({
      title: ['', Validators.required],
      date: ['', [Validators.required]],
      enddate: ['', Validators.required],
      description: ['', Validators.required],
    });
  }

  get f() { return this.newEventForm.controls; }


  getCalendarInfo() {
    this.petService.getCalendarInfoService(this.pet.id, this.idSecondary).subscribe(data => {
      this.eventsCalendar = data.calendar;
    },
    error => {
      this.loading = false;
      this._notificationSvc.warning('Hola '+this.pet.petName+'', 'Ocurrio un error favor contactar a soporte o al administrador del sitio', 6000);
    });
  }

   
  editCalendar(item:any) {
    this.isNewEvent = false;
    this.idEventUpdate = item._id;
    this.newEventForm = this.formBuilder.group({
      title: [item.title, Validators.required],
      date: [item.date, [Validators.required]],
      enddate: [item.enddate, Validators.required],
      description: [item.description, Validators.required]
    });
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

    this.petService.updateNewPetEvent(updateEvent).subscribe(data => {
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
