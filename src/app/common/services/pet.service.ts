import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})

@Injectable()
export class PetService {
  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });

  authToken: any;
  pet: any;
  petPrincipal: any;
  isDev: boolean = false;

  constructor(private httpClient: HttpClient, private jwtHelper: JwtHelperService, private router: Router) {
      this.isDev = false;  // Change to false when you're gonna deploy your app, true when is on develop 
  }

  registerPet(pet,  photo:any):Observable<any> {
    const fd = new FormData();
    fd.append('petName',pet.petName);
    fd.append('username',pet.username);
    fd.append('phone',pet.phone);
    fd.append('userState',pet.userState);
    fd.append('email',pet.email);
    fd.append('password',pet.password);
    fd.append('lat',pet.lat);
    fd.append('lng',pet.lng);
    fd.append('bussinesSelected',pet.bussinesSelected);
    fd.append('image', photo);
    fd.append('petStatus',pet.petStatus);
    fd.append('genderSelected',pet.genderSelected);
    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/register/new-pet', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/register/new-pet', fd);
    // }
    return this.httpClient.post(`${environment.ws}/pet/register/new-pet`, fd);

  }

  registerCodePet(pet,  photo:any):Observable<any> {
    const fd = new FormData();
    fd.append('petName',pet.petName);
    fd.append('username',pet.username);
    fd.append('phone',pet.phone);
    fd.append('userState',pet.userState);
    fd.append('email',pet.email);
    fd.append('password',pet.password);
    fd.append('lat',pet.lat);
    fd.append('lng',pet.lng);
    fd.append('bussinesSelected',pet.bussinesSelected);
    fd.append('image', photo);
    fd.append('petStatus',pet.petStatus);
    fd.append('genderSelected',pet.genderSelected);
    fd.append('_id',pet._id);
    fd.append('idSecond',pet.idSecond);
    fd.append('codeGenerator',pet.codeGenerator);

    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/register/new-pet-code-generator', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/register/new-pet-code-generator', fd);
    // }

    return this.httpClient.put(`${environment.ws}/pet/register/new-pet-code-generator`, fd);

  }

  registerNewPetByUserPet(pet,  photo:any):Observable<any> {
    const fd = new FormData();
    fd.append('petName',pet.petName);
    fd.append('ownerPetName',pet.ownerPetName);
    fd.append('birthDate',pet.birthDate);
    fd.append('address',pet.address);
    fd.append('_id',pet._id);
    fd.append('email',pet.email);
    fd.append('age',pet.age);
    fd.append('veterinarianContact',pet.veterinarianContact);
    fd.append('phoneVeterinarian',pet.phoneVeterinarian);
    fd.append('healthAndRequirements',pet.healthAndRequirements);
    fd.append('favoriteActivities',pet.favoriteActivities);
    fd.append('userState',pet.userState);
    fd.append('genderSelected',pet.genderSelected);
    fd.append('phone',pet.phone);
    // fd.append('linkTwitter',pet.linkTwitter);
    // fd.append('linkFacebook',pet.linkFacebook);
    // fd.append('linkInstagram',pet.linkInstagram);
    fd.append('petStatus',pet.petStatus);
    fd.append('lat',pet.lat);
    fd.append('lng',pet.lng);
    fd.append('image', photo);

    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/register/new-petByUserPet', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/register/new-petByUserPet', fd);
    // }
    return this.httpClient.put(`${environment.ws}/pet/register/new-petByUserPet`, fd);

  }

  authenticatePet(pet:any): Observable<any> {
    // if(this.isDev){
    //   return this.httpClient.post('http://localhost:8080/pet/authenticate', pet, { headers: this.headers});
    // }else{
    //   return this.httpClient.post('https://localpetsandfamilyapp.herokuapp.com/pet/authenticate', pet);
    // }
    return this.httpClient.post(`${environment.ws}/pet/authenticate`, pet, { headers: this.headers });

  }


  updatePetProfile(pet):Observable<any> { 
    const fd = new FormData();
    fd.append('petName',pet.petName);
    fd.append('ownerPetName',pet.ownerPetName);
    fd.append('birthDate',pet.birthDate);
    fd.append('address',pet.address);
    fd.append('_id',pet._id);
    fd.append('idSecond',pet.idSecond);
    fd.append('email',pet.email);
    fd.append('age',pet.age);
    fd.append('veterinarianContact',pet.veterinarianContact);
    fd.append('phone',pet.phone);
    fd.append('phoneVeterinarian',pet.phoneVeterinarian);
    fd.append('healthAndRequirements',pet.healthAndRequirements);
    fd.append('favoriteActivities',pet.favoriteActivities);
    fd.append('linkTwitter',pet.linkTwitter);
    fd.append('linkFacebook',pet.linkFacebook);
    fd.append('linkInstagram',pet.linkInstagram);

    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updateProfilePet', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/update/updateProfilePet', fd);
    // }
    
    return this.httpClient.put(`${environment.ws}/pet/update/updateProfilePet`, fd);

  }

  updatePetLocation(market):Observable<any> { 
    const fd = new FormData();
    fd.append('lat',market.lat);
    fd.append('lng',market.lng);
    fd.append('_id',market._id);
    fd.append('idSecond',market.idSecond);
    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updateLocationPet', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/update/updateLocationPet', fd);
    // }

    return this.httpClient.put(`${environment.ws}/pet/update/updateLocationPet`, fd);

  }

  updatePhotoPetProfile(id:any, idSecond: any, photo:any):Observable<any> { 
    const fd = new FormData();
    fd.append('image', photo);
    fd.append('idSecond',idSecond);
    fd.append('_id', id);

    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updatePhotoPetProfile', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/update/updatePhotoPetProfile', fd);
    // }

    return this.httpClient.put(`${environment.ws}/pet/update/updatePhotoPetProfile`, fd);

  }

  getCalendarInfoService(id: any, idSecondary: any):Observable<any> {
    // if (this.isDev) {
    //   return this.httpClient.get<any>('http://localhost:8080/pet/getCalendarData/' + id +'/'+ idSecondary);
    // } else {
    //   return this.httpClient.get<any>('pet/getCalendarData/' + id +'/'+ idSecondary);
    // }

    return this.httpClient.get(`${environment.ws}/pet/getCalendarData/`+ id +'/'+ idSecondary);

  }

  getLocationInfoService(id: any, idSecondary: any):Observable<any> {
    // if (this.isDev) {
    //   return this.httpClient.get<any>('http://localhost:8080/pet/getLocationInfo/' + id +'/'+ idSecondary);
    // } else {
    //   return this.httpClient.get<any>('pet/getLocationInfo/' + id +'/'+ idSecondary);
    // }
    return this.httpClient.get(`${environment.ws}/pet/getLocationInfo/`+ id +'/'+ idSecondary);

  }


  registerNewPetEvent(event):Observable<any> {
    const fd = new FormData();
    fd.append('title',event.title);
    fd.append('date',event.date);
    fd.append('enddate',event.enddate);
    fd.append('description',event.description);
    fd.append('idSecond',event.idSecond);
    fd.append('_id',event._id);

    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/register/newPetEvent', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/register/newPetEvent', fd);
    // }
    return this.httpClient.post(`${environment.ws}/pet/register/newPetEvent`,fd);

  }

  updateNewPetEvent(event):Observable<any> {
    const fd = new FormData();
    fd.append('title',event.title);
    fd.append('date',event.date);
    fd.append('enddate',event.enddate);
    fd.append('description',event.description);
    fd.append('idSecond',event.idSecond);
    fd.append('idEventUpdate',event.idEventUpdate);
    fd.append('_id',event._id);

    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updatePetEvent', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/update/updatePetEvent', fd);
    // }
    return this.httpClient.put(`${environment.ws}/pet/update/updatePetEvent`,fd);
  }

  sendNewPetStatusEvent(event, status):Observable<any> {
    const fd = new FormData();
    fd.append('lastPlaceLost',event.lastPlaceLost);
    fd.append('date',event.date);
    fd.append('petStatus',status.petStatus);
    fd.append('petName',status.petName);
    fd.append('descriptionLost',event.descriptionLost);
    fd.append('idSecondary',event.idSecondary);
    fd.append('_id',event._id);

    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/report/reportLostPetStatus', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/report/reportLostPetStatus', fd);
    // }

    return this.httpClient.post(`${environment.ws}/pet/report/reportLostPetStatus`,fd);

  }

  updatePetStatusReport(status:any):Observable<any> { 
    const fd = new FormData();
    fd.append('petStatus',status.petStatus);
    fd.append('petName',status.petName);
    fd.append('_id', status._id);

    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updateReportLostPetStatus', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/update/updateReportLostPetStatus', fd);
    // }
    return this.httpClient.put(`${environment.ws}/pet/update/updateReportLostPetStatus`,fd);

  }

  generateQrCodePet(obj: any):Observable<any> {
    const fd = new FormData();
    fd.append('_id', obj.idPrincipal);
    fd.append('products', JSON.stringify(obj.products));

    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/register/generateQrCodePet', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/register/generateQrCodePet', fd);
    // }

    return this.httpClient.post(`${environment.ws}/pet/register/generateQrCodePet`,fd);

  }
  
  updateStatusCodePet(obj: any):Observable<any> {
    const fd = new FormData();
    fd.append('_id', obj.idPetPrincipal);
    fd.append('idObject', obj.idObject);
    fd.append('idItemSelected', obj.idItemSelected);
    fd.append('status', obj.status);
    fd.append('photo', obj.photo);
    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updateStatusQrCodePet', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/update/updateStatusQrCodePet', fd);
    // }

    return this.httpClient.put(`${environment.ws}/pet/update/updateStatusQrCodePet`,fd);

  }

  updateStateCodePet(obj: any):Observable<any> {
    const fd = new FormData();
    fd.append('_id', obj.idPet);
    fd.append('status', obj.status);
    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updateStateActivationCode', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/update/updateStateActivationCode', fd);
    // }

    return this.httpClient.put(`${environment.ws}/pet/update/updateStateActivationCode`,fd);

  }

  getPetDataList(id, idSecondary: any, view: any):Observable<any> {    
    // if (this.isDev) {
    //   return this.httpClient.get<any>('http://localhost:8080/pet/getPetDataList?id=' + id +'&idSecond='+ idSecondary + '&view='+view );
    // } else {
    //   return this.httpClient.get<any>('pet/getPetDataList?id=' + id+'&idSecond='+ idSecondary + '&view='+view );
    // }
    return this.httpClient.get(`${environment.ws}/pet/getPetDataList?id=`+ id+'&idSecond='+ idSecondary + '&view='+view );

  }

  getAllProfileList(id):Observable<any> {
    // if (this.isDev) {
    //   return this.httpClient.get<any>('http://localhost:8080/pet/getAllProfileList/' + id);
    // } else {
    //   return this.httpClient.get<any>('pet/getAllProfileList/' + id);
    // }
    return this.httpClient.get(`${environment.ws}/pet/getAllProfileList/`+ id);

  }

  deletePetProfile(item:any):Observable<any> {
    const fd = new FormData();
    fd.append('_id',item._id);
    fd.append('idItem',item.idItem);

    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/delete/delete-pet-profile', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/delete/delete-pet-profile', fd);
    // }
    return this.httpClient.post(`${environment.ws}/pet/delete/delete-pet-profile`,fd);

  }


  getCompanyMenuList(id):Observable<any> {
    let headers = new Headers();
    this.loadToken();
    headers.append('Authorization', this.authToken);
    headers.append('Content-Type', 'application/json');
    // if (this.isDev) {
    //   return this.httpClient.get<any>('http://localhost:8080/company/getCompanyMenu/' + id);
    // } else {
    //   return this.httpClient.get<any>('company/getCompanyMenu/' + id);
    // }

    return this.httpClient.get(`${environment.ws}/company/getCompanyMenu/`+ id);

  }

  updateNewMenu(menu, photo:any):Observable<any> { 
    const fd = new FormData();
    fd.append('foodName',menu.foodName);
    fd.append('description',menu.description);
    fd.append('cost',menu.cost);
    fd.append('_id',menu._id);
    fd.append('idCompany',menu.idCompany);
    fd.append('image', photo);

    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/company/update/updateMenuItemList', fd);
    // }else{
    //   return this.httpClient.put<any>('company/update/updateMenuItemList', fd);
    // }
    return this.httpClient.put(`${environment.ws}/company/update/updateMenuItemList`,fd);

  }

  deleteMenuItem(item:any):Observable<any> {
    let headers = new Headers();
    this.loadToken();
    headers.append('Authorization', this.authToken);
    headers.append('Content-Type', 'application/json');
    const fd = new FormData();
    fd.append('_id',item._id);
    fd.append('idCompany',item.idCompany);
    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/company/delete/deleteMenuItemList',fd);
    // }else{
    //   return this.httpClient.put<any>('company/delete/deleteMenuItemList',fd);
    // }

    return this.httpClient.put(`${environment.ws}/company/delete/deleteMenuItemList`,fd);

  }


  forgotPassword(email):Observable<any> {
    const fd = new FormData();
    fd.append('email',email.email);
    // if (this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/forgot', fd);
    // } else {
    //   return this.httpClient.post<any>('pet/forgot/', fd);
    // }

    return this.httpClient.post(`${environment.ws}/pet/forgot/`,fd);

  }

  resetPassword(reset):Observable<any> {
    // if (this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/reset-pets/', reset);
    // } else {
    //   return this.httpClient.post<any>('pet/reset-pets', reset);
    // }
    return this.httpClient.post(`${environment.ws}/pet/reset-pets`,reset);

  }

  getRestaurantMenuList():Observable<any> {
    this.loadToken();
    // if (this.isDev) {
    //   return this.httpClient.get<any>('http://localhost:8080/company/getRestaurantMenuList/');
    // } else {
    //   return this.httpClient.get<any>('company/getRestaurantMenuList/');
    // }

    return this.httpClient.get(`${environment.ws}/company/getRestaurantMenuList/`);

  }

  
  // Permissions
  
  getPetPermissionsDataList(id: any, idSecondary: any):Observable<any> {
    // if (this.isDev) {
    //   return this.httpClient.get<any>('http://localhost:8080/pet/getPermissionsData/' + id +'/'+ idSecondary);
    // } else {
    //   return this.httpClient.get<any>('pet/getPermissionsData/' + id +'/'+ idSecondary);
    // }
    return this.httpClient.get(`${environment.ws}/pet/getPermissionsData/` + id +'/'+ idSecondary);

  }


  updatePetPermissionInfo(obj: any):Observable<any> {
    const fd = new FormData();
    fd.append('_id', obj.id);
    fd.append('idSecondary', obj.idSecondary);
    fd.append('showPhoneInfo', obj.showPhoneInfo)
    fd.append('showEmailInfo', obj.showEmailInfo)
    fd.append('showLinkTwitter', obj.showLinkTwitter)
    fd.append('showLinkFacebook', obj.showLinkFacebook)
    fd.append('showLinkInstagram', obj.showLinkInstagram)
    fd.append('showOwnerPetName', obj.showOwnerPetName)
    fd.append('showBirthDate', obj.showBirthDate)
    fd.append('showAddressInfo', obj.showAddressInfo)
    fd.append('showAgeInfo', obj.showAgeInfo)
    fd.append('showVeterinarianContact', obj.showVeterinarianContact)
    fd.append('showPhoneVeterinarian', obj.showPhoneVeterinarian)
    fd.append('showHealthAndRequirements', obj.showHealthAndRequirements)
    fd.append('showFavoriteActivities', obj.showFavoriteActivities)
    fd.append('showLocationInfo', obj.showLocationInfo)

    // if(this.isDev) {
    //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updatePetPermissions', fd);
    // }else{
    //   return this.httpClient.put<any>('pet/update/updatePetPermissions', fd);
    // }

    return this.httpClient.put(`${environment.ws}/pet/update/updatePetPermissions`,fd);

  }

  // Permissions



//   getUsers() {
//     let headers = new Headers();
//     this.loadToken();
//     headers.append('Authorization', this.authToken);
//     headers.append('Content-Type', 'application/json');
//     if(this.isDev){
//       return this.http.get('http://localhost:8080/users/profile/getAllUsers', {headers: headers}).map(res => res.json());
//     }else{
//       return this.http.get('users/profile/getAllUsers', {headers: headers}).map(res => res.json());
//     }
//   }

//   updateUsers(user) { 
//     let headers = new Headers();
//     headers.append('Authorization', this.authToken);
//     headers.append('Content-Type', 'application/json');
//     const token = localStorage.getItem('id_token');
//     this.authToken = token;
//     this.storeUserData(token,user);
//     if(this.isDev){
//       return this.http.put('http://localhost:8080/users/profile/updateUsers', user, {headers: headers}).map(res => res.json());
//     }else{
//       return this.http.put('users/profile/updateUsers', user, {headers: headers}).map(res => res.json());
//     }
//   }

//   getProfile() {
//     let headers = new Headers();
//     this.loadToken();
//     headers.append('Authorization', this.authToken);
//     headers.append('Content-Type', 'application/json');
//     if(this.isDev){
//       return this.http.get('http://localhost:8080/users/profile', {headers: headers}).map(res => res.json());
//     }else{
//       return this.http.get('users/profile', {headers: headers}).map(res => res.json());
//     }
//   }

//   getSettings() {
//     let headers = new Headers();
//     this.loadToken();
//     headers.append('Authorization', this.authToken);
//     headers.append('Content-Type', 'application/json');
//     if(this.isDev){
//       return this.http.get('http://localhost:8080/users/settings', {headers: headers}).map(res => res.json());
//     }else{
//       return this.http.get('users/settings', {headers: headers}).map(res => res.json());
//     }
//   }

//   getUserMessages(id) {
//     let headers = new Headers();
//     this.loadToken();
//     headers.append('Authorization', this.authToken);
//     headers.append('Content-Type', 'application/json');
//     if(this.isDev){
//       return this.http.get('http://localhost:8080/users/mailbox/getMessages/' + id, {headers: headers}).map(res => res.json());
//     }else{
//       return this.http.get('users/mailbox/getMessages/' + id, {headers: headers}).map(res => res.json());
//     }
//   }

//   //New message 

//   sendMessage(message) {
//     let headers = new Headers();
//     headers.append('Content-Type', 'application/json');
//     if(this.isDev) {
//       return this.http.post('http://localhost:8080/users/mailbox/sendMessage', message, {headers: headers}).map(res => res.json());
//     }else{
//       return this.http.post('users/mailbox/sendMessage', message, {headers: headers}).map(res => res.json());
//     }
//   }

//   forgotPassword(email) {
//     let headers = new Headers();
//     headers.append('Content-Type', 'application/json');
//     if(this.isDev) {
//       return this.http.post('http://localhost:8080/users/forgot', email, {headers: headers}).map(res => res.json());
//     }else{
//       return this.http.post('users/forgot', email, {headers: headers}).map(res => res.json());
//     }
//   }

//   resetPassword(reset) {
//     let headers = new Headers();
//     headers.append('Content-Type', 'application/json');
//     if(this.isDev) {
//       return this.http.post('http://localhost:8080/users/reset/', reset,  {headers: headers}).map(res => res.json());
//     }else{
//       return this.http.post('users/reset', reset, {headers: headers}).map(res => res.json());
//     }
//   }




// admin

getPetsList():Observable<any> {
  this.loadToken();
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/getAllPets/');
  // } else {
  //   return this.httpClient.get<any>('pet/getAllPets/');
  // }

  return this.httpClient.get(`${environment.ws}/pet/getAllPets/`);

}

getLocationPetsList():Observable<any> {
  this.loadToken();
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/getLocationAllPets/');
  // } else {
  //   return this.httpClient.get<any>('pet/getLocationAllPets/');
  // }

  return this.httpClient.get(`${environment.ws}/pet/getLocationAllPets/`);

}

getNewCodes():Observable<any> {
  this.loadToken();
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/getNewCodes/');
  // } else {
  //   return this.httpClient.get<any>('pet/getNewCodes/');
  // }

  return this.httpClient.get(`${environment.ws}/pet/getNewCodes/`);

}

registerNewCode(obj:any):Observable<any> {
  const fd = new FormData();
  fd.append('isActivated',obj.isActivated);
  fd.append('stateActivation',obj.stateActivation);
  fd.append('randomCode',obj.randomCode);
  // if(this.isDev) {
  //   return this.httpClient.post<any>('http://localhost:8080/pet/register/new-code-generator/', fd);
  // }else{
  //   return this.httpClient.post<any>('pet/register/new-code-generator/', fd);
  // }

  return this.httpClient.post(`${environment.ws}/pet/register/new-code-generator/`,fd);

}

getAllCodeList():Observable<any> {
  this.loadToken();
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/getAllCodePetsList/');
  // } else {
  //   return this.httpClient.get<any>('pet/getAllCodePetsList/');
  // }

  return this.httpClient.get(`${environment.ws}/pet/getAllCodePetsList/`);

}

getPetsLostList():Observable<any> {
  this.loadToken();
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/lost/getAllLostPets/');
  // } else {
  //   return this.httpClient.get<any>('pet/lost/getAllLostPets/');
  // }

  return this.httpClient.get(`${environment.ws}/pet/lost/getAllLostPets/`);

}


geDataList():Observable<any> {
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/getAdminDataList/');
  // } else {
  //   return this.httpClient.get<any>('pet/getAdminDataList/');
  //}
  return this.httpClient.get(`${environment.ws}/pet/getAdminDataList/`);
}

getAllShopProductList():Observable<any> {
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/getAllProductShopList/');
  // } else {
  //   return this.httpClient.get<any>('pet/getAllProductShopList/');
  // }
  return this.httpClient.get(`${environment.ws}/pet/getAllProductShopList/`);

}

getHistoryList(id:any):Observable<any> {
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/getHistoryShopList/'+ id);
  // } else {
  //   return this.httpClient.get<any>('pet/getHistoryShopList/'+ id);
  // }

  return this.httpClient.get(`${environment.ws}/pet/getHistoryShopList/`+ id);

}

  
sendNewProduct(obj):Observable<any> {
  const fd = new FormData();
  fd.append('productName',obj.productName);
  fd.append('size',obj.size);
  fd.append('color',obj.color);
  fd.append('cost',obj.cost);
  fd.append('quantity',obj.quantity);
  fd.append('description',obj.description);
  fd.append('_id',obj.id);
  
  
  // if(this.isDev) {
  //   return this.httpClient.post<any>('http://localhost:8080/pet/register/new-product/', fd);
  // }else{
  //   return this.httpClient.post<any>('pet/register/new-product/', fd);
  // }

  return this.httpClient.post(`${environment.ws}/pet/register/new-product/`, fd);

}

updateNewProduct(obj):Observable<any> {
  const fd = new FormData();
  fd.append('productName',obj.productName);
  fd.append('size',obj.size);
  fd.append('color',obj.color);
  fd.append('cost',obj.cost);
  fd.append('quantity',obj.quantity);
  fd.append('description',obj.description);
  fd.append('_id',obj.id);
  fd.append('idProduct',obj.idProduct);
  
  
  // if(this.isDev) {
  //   return this.httpClient.put<any>('http://localhost:8080/pet/update/new-product/', fd);
  // }else{
  //   return this.httpClient.put<any>('pet/update/new-product/', fd);
  // }

  return this.httpClient.put(`${environment.ws}/pet/update/new-product/`, fd);

}

addPhotoFirstORSecond(obj:any):Observable<any> { 
  const fd = new FormData();
  fd.append('image', obj.image);
  fd.append('idProduct', obj.idProduct);
  fd.append('isFistPhoto', obj.isFistPhoto);
  fd.append('_id',obj.id);

  // if(this.isDev) {
  //   return this.httpClient.put<any>('http://localhost:8080/pet/register/registerPhotoPetProduct', fd);
  // }else{
  //   return this.httpClient.put<any>('pet/register/registerPhotoPetProduct', fd);
  // }

  return this.httpClient.put(`${environment.ws}/pet/register/registerPhotoPetProduct`, fd);

}

deletePet(id:any):Observable<any> {
  const fd = new FormData();
  fd.append('_id',id);
  // if(this.isDev) {
  //   return this.httpClient.post<any>('http://localhost:8080/pet/delete/delete-pet', fd);
  // }else{
  //   return this.httpClient.post<any>('pet/delete/delete-pet', fd);
 //  }
  return this.httpClient.post(`${environment.ws}/pet/delete/delete-pet`, fd);

}


// admin


// Notifications

getNotificationsService(id):Observable<any> {
  // if (this.isDev) {
  //   return this.httpClient.get<any>('http://localhost:8080/pet/notifications/getNotificationsList/'+ id);
  // } else {
  //   return this.httpClient.get<any>('pet/notifications/getNotificationsList/'+ id);
  // }
  return this.httpClient.get(`${environment.ws}/pet/notifications/getNotificationsList/`+ id);

}

updateNotification(obj: any):Observable<any> {
  const fd = new FormData();
  fd.append('_id', obj.id);
  fd.append('isNewMsg', obj.isNewMsg);
  fd.append('idItem', obj.idItem);
  // if(this.isDev) {
  //   return this.httpClient.put<any>('http://localhost:8080/pet/update/updateNotificationsList', fd);
  // }else{
  //   return this.httpClient.put<any>('pet/update/updateNotificationsList', fd);
  // }
  return this.httpClient.put(`${environment.ws}/pet/update/updateNotificationsList`, fd);

}

deleteNotification(obj: any):Observable<any> {
  const fd = new FormData();
  fd.append('_id', obj.id);
  fd.append('idItem', obj.idItem);
  // if(this.isDev) {
  //   return this.httpClient.put<any>('http://localhost:8080/pet/delete/deleteNotificationsList', fd);
  // }else{
  //   return this.httpClient.put<any>('pet/delete/deleteNotificationsList', fd);
  // }

  return this.httpClient.put(`${environment.ws}/pet/delete/deleteNotificationsList`, fd);

}


// Notifications


//---------------CALENDAR--------------//
  authenticateGoogleToken(token:any):Observable<any> {
    const fd = new FormData();
    fd.append('token',token.token);
    fd.append('_id', token._id);
    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/calendar/authentication', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/calendar/authentication', fd);
    // }

    return this.httpClient.post(`${environment.ws}/pet/calendar/authentication`, fd);

  }

  sendEventGoogleCalendar(event:any){
    const fd = new FormData();
    fd.append('title', event.title);
    fd.append('date', event.date);
    fd.append('enddate', event.enddate);
    fd.append('description', event.description);
    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/calendar/send-new-event', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/calendar/send-new-event', fd);
    // }

    return this.httpClient.post<any>(`${environment.ws}/pet/calendar/send-new-event`, fd);

  }

  editEventGoogleCalendar(event:any){
    const fd = new FormData();
    fd.append('title', event.title);
    fd.append('date', event.date);
    fd.append('enddate', event.enddate);
    fd.append('description', event.description);
    fd.append('eventId', event.eventId);
    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/calendar/edit-event', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/calendar/edit-event', fd);
    // }
    return this.httpClient.post<any>(`${environment.ws}/pet/calendar/edit-event`, fd);

  }

  removeGoogleEvent(event:any){
    const fd = new FormData();
    fd.append('eventId', event.eventId);
    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/calendar/delete-event', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/calendar/delete-event', fd);
    // }

    return this.httpClient.post<any>(`${environment.ws}/pet/calendar/delete-event`, fd);

  }

  removeEvent(event:any){
    const fd = new FormData();
    fd.append('idEventUpdate', event.idEventUpdate);
    fd.append('_id', event._id);
    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/delete/delete-calendar-event', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/delete/delete-calendar-event', fd);
    // }

    return this.httpClient.post<any>(`${environment.ws}/pet/delete/delete-calendar-event`, fd);

  }


  closeGoogleToken(token:any){
    const fd = new FormData();
    fd.append('token',token.token);
    fd.append('_id', token._id);
    // if(this.isDev) {
    //   return this.httpClient.post<any>('http://localhost:8080/pet/calendar/close-sesion', fd);
    // }else{
    //   return this.httpClient.post<any>('pet/calendar/close-sesion', fd);
    // }

    return this.httpClient.post<any>(`${environment.ws}/pet/calendar/close-sesion`, fd);

  }


  storeUserData(token, pet) {
    localStorage.setItem('id_token', token);
    localStorage.setItem('pet', JSON.stringify(pet));
    this.authToken = token;
    this.pet = pet;
  }

  storePrincipalUserData(pet) {
    localStorage.setItem('petPrincipal', JSON.stringify(pet));
    this.petPrincipal = pet;
  }

  setidTrack(id){
    localStorage.setItem('idSelected', id);
  }

  getidTrack(){
    return localStorage.getItem('idSelected');
  }
  
  getPrincipalUserData() {
    return localStorage.getItem("petPrincipal");
  }

  getLocalPet(){
    return localStorage.getItem("pet");
  }

  setstoreUserData(pet){
    localStorage.setItem('pet', JSON.stringify(pet));
    this.pet = pet;
  }

  loadToken() {
    const token = localStorage.getItem('id_token');
    this.authToken = token;
  }

  loggedIn() {
    const token: string = localStorage.getItem('id_token');
    return token != null && !this.jwtHelper.isTokenExpired(token);
  }

  logout() {
    this.authToken = null;
    this.pet = null;
    localStorage.clear();
    this.router.navigate(['/home']);
  }
}