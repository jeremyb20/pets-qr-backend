import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
// import { ApiService } from './api.service';
import { Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TokensService {

    private container: TokenContainer = new TokenContainer();
    private checkToken: boolean = true;
	
	constructor(private router: Router) {
        this.checkToken = true;
    }

	setToken(token: string, expire: number) {
		this.container.Token = token;
        this.container.Expire = expire;
		if (this.container.TimerRef == undefined && this.container.Expire != undefined) {
            this.checkToken = true;
            this.container.TimerRef = interval(60 * 1000)
            .pipe(takeWhile(() => this.checkToken))
            .subscribe(() => { this.processToken(false); });
        }
	}

	clearToken() {
        this.checkToken = false;
        if (this.container.TimerRef)
            this.container.TimerRef.unsubscribe();
        this.container = new TokenContainer();
		this.saveToken(null, null);
	}

	getToken() {
		if (this.container.Token === "") {
			if (sessionStorage.getItem("access_token") === null)
                window.location.href = "/";
            else
				this.setToken(sessionStorage.getItem("access_token"), Number(sessionStorage.getItem("access_expire")));
		}
		return this.container;
	};

	saveToken(token: string, expire: number) {            
		this.setToken(token, expire);
		if (token != null && expire != null) {
			sessionStorage.setItem("access_token", token);
			sessionStorage.setItem("access_expire", expire.toString());
		}
		else {
			sessionStorage.removeItem("access_token");
			sessionStorage.removeItem("access_expire");
		}
    }
	
	private getMinutesToExpire(expire) {
		let nowTime = new Date();
		let diff = expire - (nowTime.getTime()/1000);
		return (diff / 60);
    }

	processToken(reload: boolean) {
		if (this.container.TimerRef != undefined && this.container.Expire) {
			let expirein = this.getMinutesToExpire(this.container.Expire);
			//console.log('token ex ' + expirein);
            if (expirein < 30) {
                // this.apiSrvc.renewToken(this.container.Token)
                // .subscribe(
                //     data => {
                //         //console.log("renewed: ", data);
                //         if (data && data.ErrorMessage == "")
                //             this.saveToken(data.AccessToken, data.ExpirationEpoch);
                //     },
                //     error => {
                //     },
                //     () => {
                //         if (reload)
                //             window.location.reload();
                //     }
                // );
            }
            else
                if (reload) window.location.reload();
		}
	}
}

export class TokenContainer {    
    Expire: number;
    TimerRef: Subscription;
    Token: string;

    constructor() {
        this.Token = '';
        this.Expire = 0;
        this.TimerRef = undefined;
    }
}