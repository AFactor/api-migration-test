# Kibana custom dashboard

### Introduction

At this moment  Royal Mail version of Kibana tool is open source and as such does not offer authentication and role based authorization. So anyone within Royal mail corporate network can view and edit the visualizations and dashboards on offer.

To avoid this, we can use a custom reporting dashboard and share the kibana visualizations in our custom dashboard, Kibana alllows you to do this either as a snapshot (static) or real time.

This is a no-frill version of the custom dashboard.
### Authetication
This version offers basic http authentication but does not a form to capture it.

### How to run
This version has three basic kibana dashboards running from it. One each for API volume, API performance, and scans.

- git clone https://andotbt.royalmailgroup.net/scm/big/apic-kibana-custom-dashboard.git

- Install node js ( if not there)

- cd to the source folder.
- run `npm install`

- run  `node app.js`
- Console log will print '* Kibana custom dashboard is listening on port 4001!*'
	 - API Performance: http://localhost:4001/html/apiperformance.html
	 - API Volumes: : http://localhost:4001/html/apivolume.html
	 - Daily Scans: http://localhost:4001/html/dailyscans.html
- To add a new dashboard
	 - Create dashboard in Kibana
	 - Copy link for embedded IFrame
	 - Create a new html page and add the copied IFrame.
	 - Adjust width and height accordingly.

### Next Steps.
#### Login
There are two good npm packages for this to provide out of the box support.
 *express-basic-auth*
 Very simple. Already part of the application. Need a login page to capture login data.
*Passsport JS* http://passportjs.org/docs
Supports Local, Oauth and OpenId.

#### Menu
Users should offer a simple menu to traverse to various dashboards.
This could be as simple as set of links on the home page.

#### Auto Refresh
While Kibana dashboards can be set on auto refresh at set intervals, this is not available for custom dashboard pages. A little bit of javascript can achieve this very easily, so that pages can be refreshed periodically.


