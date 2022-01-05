import { Injectable } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BootstrapBreakpoints } from '../constants/constants';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class MediaService {
	private activeBreakpoints: string[] = [];
	private breakpoints: string[];
	
    constructor(private breakpointObserver: BreakpointObserver) { }
	
	private isMobile(): boolean {
		return this.activeBreakpoints.findIndex(breakpoint => breakpoint === BootstrapBreakpoints[0].Name || breakpoint === BootstrapBreakpoints[1].Name || breakpoint === BootstrapBreakpoints[2].Name) > -1;
	}

	private isTablet() {
		return this.activeBreakpoints.findIndex(breakpoint => breakpoint === BootstrapBreakpoints[2].Name) > -1;
	}

	private isLandscape() {
		return this.activeBreakpoints.findIndex(breakpoint => breakpoint === BootstrapBreakpoints[5].Name) > -1;
    }
    
    private isSmallScreen() {
		return this.activeBreakpoints.findIndex(breakpoint => breakpoint === BootstrapBreakpoints[0].Name || breakpoint === BootstrapBreakpoints[1].Name) > -1;
	}

	private getBreakpoints(): string[] {
		this.breakpoints = [];
		for (let media of BootstrapBreakpoints)
			this.breakpoints.push(media.MediaQuery);
		return this.breakpoints;
	}
	
	private getBreakpointName(breakpointValue): string {		
		return BootstrapBreakpoints.find(breakpoint => breakpoint.MediaQuery === breakpointValue).Name;
	}
    
    subscribeMedia(): Observable<MediaResponse> {
		return this.breakpointObserver
		.observe(this.getBreakpoints())
		.pipe(map((observeResponse) => this.getBreakpointsResponse(observeResponse.breakpoints)));
    }
    
    getInitState(): MediaResponse {
        let mediaInfo: MediaResponse = new MediaResponse();
        mediaInfo.IsMobile = this.isMobile();
        mediaInfo.IsTablet = this.isTablet();
        mediaInfo.IsLandscape = this.isLandscape();
        mediaInfo.IsSmallScreen = this.isSmallScreen();
        return mediaInfo;
    }

    private getBreakpointsResponse(breakpoints): MediaResponse {
		this.activeBreakpoints = [];	
		Object.keys(breakpoints).map((key) => {
			if (breakpoints[key])
				this.activeBreakpoints.push(this.getBreakpointName(key));
		});
        let mediaInfo: MediaResponse = new MediaResponse();
        mediaInfo.IsMobile = this.isMobile();
        mediaInfo.IsTablet = this.isTablet();
        mediaInfo.IsLandscape = this.isLandscape();
        mediaInfo.IsSmallScreen = this.isSmallScreen();
        return mediaInfo;
	}
}

export class MediaResponse {
    IsLandscape: boolean;
    IsSmallScreen: boolean;
    IsMobile: boolean;    
    IsTablet: boolean;

    constructor() {
        this.IsMobile = false;
        this.IsTablet = false;
        this.IsLandscape = false;
        this.IsSmallScreen = false;
    }
}