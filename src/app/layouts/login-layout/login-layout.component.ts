import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
	selector: 'app-login-layout',
	templateUrl: './login-layout.component.html',
  	styleUrls: ['./login-layout.component.scss'],
})
export class LoginLayoutComponent implements OnInit {
	showWebHeader = false;
	showWebsite = false;
	imageSrc = '';
	part = [];
	domain = '';
	user = {
        loginName: '',
        password: '',
        webSite: ''
    };

  	constructor(private httpClient: HttpClient, private route: Router) {
	
    }

  	ngOnInit() {}
	  
	
	
	
}