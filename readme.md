# Real-time Electronic Area Canvassing Tool (REACT)
## Description

REACT is the Real-time Electronic Area Canvassing Tool developed for the Chandler Police Department  in cooperation with the City of Chandler's IT division and the Crime Analysis and Research Unit (CARU). This tool provides a common operation picture for incident commanders of community coverage during an event requiring officers to contact area residents.  

The application uses the Esri ArcGIS Platform, namely ArcGIS for Server and the ArcGIS API for JavaScript.   There are two pieces to the application, an admin interface for managing event areas (creating new ones, retiring old events, etc) and the user application, which is as simple as possible to provide a quick tool for users in the field on mobile device.  

## Use
### Admins
Administrators can log into the admin.html application.   This application allows them to enter an event name, or select an existing event from a list.  When they are zoomed in to the parcel level they can select parcels to include in the canvassing area, and then create or update the event with the selected parcels.  When an event is completed, the Retire Event button hides that particular event from REACT users to keep from cluttering the map, but the data is still available to ArcMap users if any historical data is needed.
You can test the REACT Admin demo here: [REACT Admin]( https://www.chandleraz.gov/gis/reactdemo/admin.html) 

### Users
After administrators have setup the canvassing area, users in the field open the web application and zoom to the event area.  They can then select a parcel that is in the event area and mark whether they attempted contact or if contact was successful.  Since we use secured services users actions are tracked in the database, so we can tell who marked a particular parcel as contacted.

## Requirements
ArcGIS for Server 10.2.2 or greater
Enterprise Geodatabase
ArcGIS API for JavaScript
Web server

To setup your own version of REACT you’ll need to setup data in the Enterprise Geodatabase and publish services off those feature classes in order to allow the REACT application to work.  For the our application we used a copy of the City's Parcel Polygon layer, because that is a little more user friendly than having people tap address points on a touchscreen device. We also created a table for the canvassing events to be stored and archived with fields for our parcel unique identifier, contacted status (coded domain), the event name, and whether the event is active.  We also enabled editor tracking, since this allows us to track who updates a particular parcel's status when used with a secured map service.

In ArcCatalog, we established a one-to-many relationship between Parcel Poly layer and the Neighborhood Canvassing table.  This layer is then published as a feature service to our ArcGIS server.

We decided to create a separate Map Service to display parcels since this would allow us to use the related table as a join to symbolize the parcels based of their event status.  We joined the canvassing table to the parcel layer by unique id, and symbolized by the contact status.  A definition query only shows active events in the parcel layer.  This was published as the second map service the REACT application consumes.

We also have a custom basemap that our Officers are familiar with and we have published and cached that to use as a basemap in the application.

## License

MIT License

Copyright (c) 2016 Jerry Corum

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.