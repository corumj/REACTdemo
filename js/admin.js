var map;

// Consolidated map service URLs
const ReactFSPoly = 'https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_FS/FeatureServer/0';
const ReactFSTable = 'https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_FS/FeatureServer/1'
const ReactMS = 'https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_MS/MapServer';
// const ReactBaseMap = '';

require([
  "esri/map",
  "esri/graphic",
  "esri/graphicsUtils",

  "esri/geometry/Extent",

  "esri/layers/FeatureLayer",
  "esri/layers/ArcGISTiledMapServiceLayer",
  "esri/layers/ArcGISDynamicMapServiceLayer",

  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",

  "esri/tasks/query",
  "esri/tasks/RelationshipQuery",

  "esri/toolbars/draw",

  "dojo/parser",
  "dijit/registry",
  "dojo/on",
  "dojo/dom",
  "dojo/dom-attr",
  "dojo/dom-construct",

  "esri/Color",

  "dijit/form/Button",
  "dijit/form/TextBox",
  "dijit/form/ValidationTextBox",

  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dojo/domReady!"
], function(
      Map, Graphic, graphicsUtils,
      Extent,
      FeatureLayer, ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer,
      SimpleFillSymbol, SimpleLineSymbol,
      Query, RelationshipQuery,
      Draw,
      parser, registry, on, dom, domAttr, domConstruct,
      Color,
      Button, TextBox, ValidationTextBox) {
    parser.parse();
    var selectionToolbar;
    map = new Map("mapDiv", {
      center: [-111.841,33.304],
      zoom: 14,
        sliderPosition:"bottom-left",
      basemap: 'streets'
    });
    dojo.connect(map, "onLoad", function() {
      var initExtent = map.extent;
      dojo.create("div", {
        className: "esriSimpleSliderHomeButton",
          onclick: function() {
            map.setExtent(initExtent);
          }
      }, dojo.query(".esriSimpleSliderIncrementButton")[0], "after");
    });
    map.on("load", initSelectToolbar);

    var mapExtentChange = map.on("extent-change", changeHandler);

    function changeHandler(evt) {
      if (map.getLevel() < 16) {
        dijit.byId("selectParcels").setAttribute('disabled', true);
        dijit.byId("createCanvassArea").setAttribute('disabled', true);
      } else {
        dijit.byId("selectParcels").setAttribute('disabled', false);
        dijit.byId("createCanvassArea").setAttribute('disabled', false);
      }
    }
    // FEATURE SERVICE //
    var nbhd_poly = new FeatureLayer(ReactFSPoly, {
      mode: FeatureLayer.MODE_ONDEMAND,
      outFields: ["*"],
      id: "nbhd_poly"
    });
    // RELATED TABLE //
    var canvassTable = new FeatureLayer(ReactFSTable);
    // BASEMAP //
    // var basemaplayer = new ArcGISTiledMapServiceLayer(ReactBaseMap, {
    //   id: "basemaplayer"
    // });
    // Canvassing Area MapServer
    var mapservicelayer = new ArcGISDynamicMapServiceLayer(ReactMS, {
      id: "mapservicelayer",
      disableClientCaching: true,
      opacity: 0.55,
    });
    // Add the layers to the map
    map.addLayers([nbhd_poly, mapservicelayer]);

    function updateCurrentEvents() {
      var activeEventsQueryTask = new esri.tasks.QueryTask(ReactFSTable);
      var activeEventsQuery = new Query();
      activeEventsQuery.outFields = ["EVENT_NAME"];
      activeEventsQuery.where = "ACTIVE='Yes'";
      activeEventsQueryTask.execute(activeEventsQuery, function(results) {
        if (results.features.length > 0) {
          var currentEventArray = [];
          results.features.forEach(function(element, index, array) {
            if (currentEventArray.indexOf(element.attributes.EVENT_NAME) === -1 && element.attributes.EVENT_NAME !== null) {
              currentEventArray.push(element.attributes.EVENT_NAME);
            }
          });
          var eventList = "<h4>Active events:</h4>\n<ul>\n";
          currentEventArray.sort();
          currentEventArray.forEach(function(element, index, array) {
            eventList += "<li>" + element + "</li>\n";
          });
          eventList += "</ul>";
          dom.byId("activeEvents").innerHTML = eventList;
        }
      });
    }
    updateCurrentEvents();

    //validate event text box entry
    $("#event_id").keypress(function(e) {
      var regex = new RegExp("^[a-zA-Z0-9]+$");
      var str = String.fromCharCode(!e.charCode ? e.which : e.charCode);
      if (regex.test(str)) {
        return true;
      }
      e.preventDefault();
      return false;
    });
    // establish what a selected parcel will look like
    var ParcelSelectionSymbol =
      new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
        new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
      new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.5]));
    nbhd_poly.setSelectionSymbol(ParcelSelectionSymbol);

    // Button functions
    on(dom.byId("selectParcels"), "click", function() {
      if (dijit.byId("selectParcels").get("disabled") === false) {
        selectionToolbar.activate(Draw.EXTENT);
      }
    });
    on(dom.byId("clearSelection"), "click", function () {
          nbhd_poly.clearSelection();
        });
    on(dom.byId("createCanvassArea"), "click", function () {
      if (dijit.byId("createCanvassArea").get("disabled") === false) {
          var evtName = registry.byId("event_id").get("value");
          if (evtName === "") {
            alert("Event Name cannot be blank");
          } else {
            var proceed = confirm("The selection will be used to create or add parcels to " + evtName);
            var locArray = [];
            if (proceed) {
              var selectedFeatures = nbhd_poly.getSelectedFeatures();
              var selectedEIDArray = [];
              selectedFeatures.forEach(function(element, index, array) {
                selectedEIDArray.push(element.attributes.EID);
              });
              var existingQueryTask = new esri.tasks.QueryTask(ReactFSTable);
              var existingQuery = new Query();
              existingQuery.outFields = ["*"];
              existingQuery.where = "EVENT_NAME='" + evtName + "'";
              existingQueryTask.execute(existingQuery, function(results) {
                if (results.features.length !== 0 && results.features[0].attributes.ACTIVE === "Yes") {
                  // check for duplicates and remove them from the selectedEIDArray
                  results.features.forEach(function(existingElement, existingIndex, ExistingArray) {
                    var index = selectedEIDArray.indexOf(existingElement.attributes.EID);
                    if (index >= 0) {
                      selectedEIDArray.splice(index, 1);
                    }
                  });
                  selectedEIDArray.forEach(function(element, index, array) {
                    var addLoc = {
                      attributes: {
                        EID: element,
                        CONTACTED: 3,
                        EVENT_NAME: evtName,
                        ACTIVE: "Yes"
                      }
                    };
                    locArray.push(addLoc);
                  });
                  canvassTable.applyEdits(locArray, null, null, function(addResults) {
                    mapservicelayer.refresh();
                    nbhd_poly.clearSelection();
                  });
                } else if (results.features.length !== 0 && results.features[0].attributes.ACTIVE === "No") {
                    alert(evtName + " is not an active event, you cannot add new parcels to it.");
                  } else {
                    selectedFeatures.forEach(function(element, index, array) {
                      var addLoc = {
                        attributes: {
                          EID: element.attributes.EID,
                          CONTACTED: 3,
                          EVENT_NAME: evtName,
                          ACTIVE: "Yes"
                          }
                      };
                      locArray.push(addLoc);
                    });
                    canvassTable.applyEdits(locArray, null, null, function(addResults) {
                      mapservicelayer.refresh();
                      nbhd_poly.clearSelection();
                      updateCurrentEvents();
                    });
                  }
              });
            }
          }
        }
        });
    on(dom.byId("retireEvent"), "click", function() {
      var evtName = registry.byId("event_id").get("value");
      if (evtName === "") {
        alert("Event Name cannot be blank");
      } else {
      var retireYesNo = confirm("Are you sure you wish to retire this event?\n" + evtName);
      if (retireYesNo) {
        var existingQueryTask = new esri.tasks.QueryTask(ReactFSTable);
        var existingQuery = new Query();
        var locArray = [];
        existingQuery.outFields = ["*"];
        existingQuery.where = "EVENT_NAME='" + evtName + "'";
        existingQueryTask.execute(existingQuery, function(results) {
          if (results.features.length === 0 ) {
            alert("There is no event named " + evtName);
          } else {
            results.features.forEach(function(element, index, array) {
              var addLoc = {
                attributes: {
                  OBJECTID: element.attributes.OBJECTID,
                  ACTIVE: "No"
                }
              };
              locArray.push(addLoc);
            });
          canvassTable.applyEdits(null, locArray, null, function(addResults) {
            nbhd_poly.clearSelection();
            $("#event_id").prop("value", "");
            map.centerAndZoom([-111.841,33.304], 14);
            mapservicelayer.refresh();
            updateCurrentEvents();
          });
          }
        });
      }}

    });
    // If a current event in the lsit is clicked copy its value to the event name text box
    $("#activeEvents").delegate("li", "click", function() {
      //update event_id text box with value of clicked list element
      $("#event_id").prop("value", $(this)[0].innerHTML);

      //zoom to the clicked event's location
      var clickedEvent = $(this)[0].innerHTML;
      var clickedQueryTask = new esri.tasks.QueryTask(ReactFSTable);
      var clickedQuery = new Query();
      clickedQuery.outFields = ["EID"];
      clickedQuery.where = "EVENT_NAME='" + clickedEvent + "'";
      clickedQueryTask.execute(clickedQuery, function(results) {
        var findClickedFeatures = new Query();
        var clickedObjectEIDs = [];
        results.features.forEach(function(element, index, array) {
          clickedObjectEIDs.push(element.attributes.EID);
        });
        var objectIDsAsNumber = clickedObjectEIDs.toString();
        findClickedFeatures.where = "EID IN (" + objectIDsAsNumber + ")";
        nbhd_poly.selectFeatures(findClickedFeatures, FeatureLayer.SELECTION_NEW, function(features){
          var selectExtent = new Extent(features[0].geometry.getExtent());
          for (var i = 1, len = features.length - 1; i < len; i++) {
            selectExtent = selectExtent.union(features[i].geometry.getExtent());
          }
          map.setExtent(selectExtent);
          nbhd_poly.clearSelection();
        });

      });
    });
    // Selection toolbar initialization (activated by button click but has to be prepped first)
    function initSelectToolbar (event) {
      selectionToolbar = new Draw(event.map);
      var selectQuery = new Query();

      on(selectionToolbar, "DrawEnd", function (geometry) {
        selectionToolbar.deactivate();
        selectQuery.geometry = geometry;
        nbhd_poly.selectFeatures(selectQuery,
          FeatureLayer.SELECTION_NEW);
      });
    }

});
