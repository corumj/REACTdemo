
  var map, cred = "esri_jsapi_id_manager_data"; //cookie/local storage name
  var canvassStatus;
  var relatedObjectID;
  $("#contacted, #attempted, #notContacted, #address").hide();
  require([
    "dojo/dom-construct",
    "dojo/dom",
    "dojo/parser",
    "dojo/cookie",
    "dojo/_base/unload",
    "dojo/ready",
    "esri/map",
    "esri/IdentityManager",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/FeatureLayer",
    "esri/tasks/query",
    "esri/tasks/RelationshipQuery",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/graphic",
    "esri/geometry/Circle",
    "esri/geometry/Extent",
    "esri/dijit/HomeButton",
    "esri/request",
    "dojo/domReady!"], function(domConstruct, dom, parser, cookie, baseUnload, ready, Map, esriId, ArcGISTiledMapServiceLayer,
                              ArcGISDynamicMapServiceLayer, FeatureLayer,
                              Query, RelationshipQuery, SimpleMarkerSymbol,
                              SimpleLineSymbol, Color, Graphic, Circle, Extent, HomeButton, esriRequest) {

      // store credentials/serverInfos before the page unloads
      //baseUnload.addOnUnload(storeCredentials);

      // look for credentials in local storage
      //loadCredentials();

      map = new Map("mapDiv", {
        center: [-111.8349,33.3155],
        zoom: 17,
          sliderPosition:"bottom-left",
        basemap: "topo"
      });
      dojo.connect(map, "onLoad", function() {
        var initExtent = map.extent;
        dojo.create("div", {
          className: "esriSimpleSliderHomeButton",
            onclick: function() {
              console.log("I've been clicked!");
              map.setExtent(initExtent);
            }
        }, dojo.query(".esriSimpleSliderIncrementButton")[0], "after");
      });

      //var basemapServiceUrl = "https://chandleraz.gov/arcgis/rest/services/PublicSafety/basemap/MapServer";
      var sourceMapServiceLayerUrl = "https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_MS/MapServer";

      // FEATURESERVICE //
      var nbhd_poly = new FeatureLayer("https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_FS/FeatureServer/0", {
        mode: FeatureLayer.MODE_ONDEMAND,
        outFields: ["*"],
        id: "nbhd_poly"
      });
      // BASEMAP //
      // var basemaplayer = new ArcGISTiledMapServiceLayer(basemapServiceUrl, {
      //   id: "basemaplayer"
      // });
      // MAPSERVICE //
      var mapservicelayer = new ArcGISDynamicMapServiceLayer(sourceMapServiceLayerUrl, {
        id: "mapservicelayer",
        disableClientCaching: true,
        opacity: 0.55,
        refreshInterval: 0.55  // Time in minutes
      });
      map.addLayers([nbhd_poly, mapservicelayer]);

  //     function loadCredentials() {
	// var idJson, idObject;
  //
	// if (supports_local_storage()) {
	//   // read from local storage
	//   idJson = window.localStorage.getItem(cred);
	// }
	// else {
	//   // read from a cookie
	//   idJson = cookie(cred);
	// }
  //
	// if (idJson && idJson != "null" && idJson.length > 4) {
	//   idObject = JSON.parse(idJson);
	//   esriId.initialize(idObject);
	// }
	// else {
	//   console.log("didn't find anything to load");
	// }
  //     }
  //
  //     function storeCredentials() {
	// // make sure there are some credentials to persist
	// if (esriId.credentials.length === 0) {
	//   return;
	// }
  //
	// // serialize the ID manager state to a string
	// var idString = JSON.stringify(esriId.toJson());
	// // store it client side
	// if (supports_local_storage()) {
	//   // use local storage
	//   window.localStorage.setItem(cred, idString);
	//    console.log("wrote to local storage");
	// }
	// else {
	//   // use a cookie
	//   cookie(cred, idString, {expires: 60});
	//    console.log("wrote a cookie");
	// }
  //     }
  //
  //     function supports_local_storage() {
	// try {
	//   return "localStorage" in window && window["localStorage"] !== null;
	// } catch (e) {
	//   return false;
	// }
  //     }

      //working around an arcgis server feature service bug.  Requests to queryRelatedRecords operation fail with feature service 10.
      //Detect if request conatins the queryRelatedRecords operation and then change the source url for that request to the corresponding mapservice
      esriRequest.setRequestPreCallback(function(ioArgs) {
        if (ioArgs.url.indexOf("queryRelatedRecords") !== -1) {
          ioArgs.url = ioArgs.url.replace("FeatureServer", "MapServer");
        }
        return ioArgs;
      });


      statusQueryTask = new esri.tasks.QueryTask("https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_FS/FeatureServer/1");
      statusQuery = new esri.tasks.Query();
      statusQuery.outFields = ["OBJECTID","EID", "CONTACTED", "ACTIVE"];

      nbhd_poly.on("click", function(evt) {
	$(".action-btns").slideDown();
        $(".btn").removeClass("active disabled").css({"color": "black","background-color":"white"});
        var graphicAttributes = evt.graphic.attributes;
        var centerMe = evt.graphic.geometry.getExtent().getCenter();
        map.centerAndZoom(centerMe, 19);
        console.log(centerMe);
        var address = graphicAttributes.SITUS_ADDRESS_LINE_1;
        $("#address").html(toTitleCase(address)).slideDown();
        map.graphics.clear();
        var highlightSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,255,255],0.25), 4.5);
        var highlightGraphic = new Graphic(evt.graphic.geometry,highlightSymbol);
        map.graphics.add(highlightGraphic);

        statusQuery.where = "EID=" + graphicAttributes.EID + " and ACTIVE = 'Yes'";
        statusQueryTask.execute(statusQuery, function(results) {
          if (results.features.length === 0) {
            $("#notInArea").html(toTitleCase(address) + " is not in the event area").slideDown();
            $("#contacted, #attempted, #notContacted, #address").hide();
          } else {
            $("#notInArea").hide();
            $("#contacted, #attempted, #notContacted").slideDown();
            canvassStatus = results.features[0].attributes.CONTACTED;
            relatedObjectID = results.features[0].attributes.OBJECTID;
            switch (canvassStatus) {
              case 1:
                $("#contacted").addClass("active disabled").css({"color":"green", "background-color":"rgb(204,204,204)"});
                break;
              case 2:
                $("#attempted").addClass("active disabled").css({"color": "gold", "background-color":"rgb(204,204,204)"});
                break;
              case 3:
                $("#notContacted").addClass("active disabled").css({"color": "red", "background-color":"rgb(204,204,204)"});
                break;
              default:
                break;
            }
          }
        });
      });



  $("#contacted").on('click', function() {
    $(this).addClass("active disabled").css({"color":"green", "background-color":"rgb(204,204,204)"}).blur().siblings().removeClass("active disabled").css({"color": "","background-color":"white"});
    queryAGS(relatedObjectID,1);
  });
  $("#attempted").on('click', function() {
    $(this).addClass("active disabled").css({"color": "gold", "background-color":"rgb(204,204,204)"}).blur().siblings().removeClass("active disabled").css({"color":"","background-color":"white"});
    queryAGS(relatedObjectID,2);
  });
  $("#notContacted").on('click', function() {
    $(this).addClass("active disabled").css({"color": "red", "background-color":"rgb(204,204,204)"}).blur().siblings().removeClass("active disabled").css({"color":"","background-color":"white"});
    queryAGS(relatedObjectID,3);

  });
  function toTitleCase(str)
  {
    if (str === null) {
      return "No address at location";
    } else {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
  }
  var queryAGS = function(oid, status) {
    var updatestring = [{attributes: {
                            CONTACTED: status,
                            OBJECTID: oid
                          }}];

    var querystring = "f=pjson&updates=" + JSON.stringify(updatestring); // + "&token=" + esriId.credentials[0].token;

    $.ajax({
      url: "https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_FS/FeatureServer/1/applyEdits",
      accepts: "json",
      data: querystring,
      type: "POST",
      success: function(response) {
        mapservicelayer.refresh();
      }
    });

  };
});
