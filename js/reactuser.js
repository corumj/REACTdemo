
// Declare global variables that are updated in multiple functions
var map, cred = "esri_jsapi_id_manager_data"; //cookie/local storage name
var resultObj;
var graphicAttributes;
var relatedObjectID;

// Consolidated map service URLs
const ReactFSPoly = 'https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_FS/FeatureServer/0';
const ReactFSTable = 'https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_FS/FeatureServer/1'
const ReactMS = 'https://chandleraz.gov/arcgis/rest/services/demo/REACT_DEMO_MS/MapServer';
// const ReactBaseMap = '';

require([
    "dojo/dom-construct",
    "dojo/dom",
    "dojo/parser",
    "dojo/cookie",
    "dojo/_base/unload",
    "dojo/ready",

    "esri/map",
    "esri/IdentityManager",
    "esri/urlUtils",

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
    "dojo/domReady!"], function(domConstruct, dom, parser, cookie, baseUnload, ready,
                            Map, esriId, urlUtils,
                            ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer, FeatureLayer,
                            Query, RelationshipQuery,
                            SimpleMarkerSymbol, SimpleLineSymbol, Color, Graphic, Circle, Extent,
                            HomeButton, esriRequest) {

    // Initialize the welcome message
    $( document ).ready(function() {
            $("#mapDiv").append("<div id='titleDiv'><p id='messages'>REACT: Select a parcel in the event area</p></div>");
        });
    // store credentials/serverInfos before the page unloads
    baseUnload.addOnUnload(storeCredentials);
    // look for credentials in local storage
    loadCredentials();

    map = new Map("mapDiv", {
        center: [-111.8348,33.3155],
        zoom: 18,
            sliderPosition:"bottom-left",
        basemap: 'streets'
    });

    dojo.connect(map, "onLoad", function() {
        window.scrollTo(0,0);
        var initExtent = map.extent;
        dojo.create("div", {
            className: "esriSimpleSliderHomeButton",
            onclick: function() {
                map.setExtent(initExtent);
            }
        }, dojo.query(".esriSimpleSliderIncrementButton")[0], "after");
    });

    // FEATURESERVICE //
    var nbhd_poly = new FeatureLayer(ReactFSPoly, {
        mode: FeatureLayer.MODE_ONDEMAND,
        outFields: ["*"],
        id: "nbhd_poly"
    });

    var nbhd_table = new FeatureLayer(ReactFSTable, {
        outFields: ["*"]
    })

    // BASEMAP //
    // var basemaplayer = new ArcGISTiledMapServiceLayer(ReactBaseMap, {
    //   id: "basemaplayer"
    // });

    // MAPSERVICE //
    var mapservicelayer = new ArcGISDynamicMapServiceLayer(ReactMS, {
        id: "mapservicelayer",
        disableClientCaching: true,
        opacity: 0.55,
        refreshInterval: 0.55  // Time in minutes
    });

    map.addLayers([nbhd_poly, mapservicelayer]);

    //working around an arcgis server feature service bug.  Requests to queryRelatedRecords operation fail with feature service 10.
    //Detect if request conatins the queryRelatedRecords operation and then change the source url for that request to the corresponding mapservice
    esriRequest.setRequestPreCallback(function(ioArgs) {
        if (ioArgs.url.indexOf("queryRelatedRecords") !== -1) {
            ioArgs.url = ioArgs.url.replace("FeatureServer", "MapServer");
        }
        return ioArgs;
    });

    nbhd_poly.on("click", function(evt) {
        map.graphics.clear();
        graphicAttributes = evt.graphic.attributes;

        var centerMe = evt.graphic.geometry.getExtent().getCenter();
        map.centerAndZoom(centerMe, 19);

        var address = graphicAttributes.SITUS_ADDRESS_LINE_1;

        var highlightSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,255,255],0.25), 4.5);
        var highlightGraphic = new Graphic(evt.graphic.geometry,highlightSymbol);
        map.graphics.add(highlightGraphic);

        var statusResults = statusQueryUpdate(graphicAttributes.EID);
        statusResults.then(function(results) {
            if (results.features.length) {
                $("#messages").html(toTitleCase(address));
                relatedObjectID = results.features[0].attributes.OBJECTID;
                resultObj = {
                    objectId: results.features[0].attributes.OBJECTID,
                    EID: results.features[0].attributes.EID,
                    Contacted: results.features[0].attributes.CONTACTED
                }
                if (!$(".btn-group").length) {
                    makeActionButtonDiv();
                }
                updateBtnStatus(resultObj.Contacted);
            } else {
                $("#messages").html(toTitleCase(address) + " is not in the event area");
                $("#action-butons").remove();
            }
        });
    });

var queryAGS = function(oid, status) {
    var updatestring = {
        attributes: {
            objectId: oid,
            CONTACTED: status
        }
    };

    nbhd_table.applyEdits(null, [updatestring], null);
    nbhd_table.on("edits-complete", function() {
        mapservicelayer.refresh();
    }, function(error) {
        alert('An error has occured, please try again');
    });
};

function toTitleCase(str) {
    if (str === null) {
        return "No address at location";
    } else {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
}

function loadCredentials() {
    var idJson, idObject;

    if (supports_local_storage()) {
    // read from local storage
    idJson = window.localStorage.getItem(cred);
    }
    else {
    // read from a cookie
    idJson = cookie(cred);
    }

    if (idJson && idJson != "null" && idJson.length > 4) {
    idObject = JSON.parse(idJson);
    esriId.initialize(idObject);
    }
    else {
    console.log("didn't find anything to load");
    }
}

function storeCredentials() {
    // make sure there are some credentials to persist
    if (esriId.credentials.length === 0) {
    return;
    }

    // serialize the ID manager state to a string
    var idString = JSON.stringify(esriId.toJson());
    // store it client side
    if (supports_local_storage()) {
    // use local storage
    window.localStorage.setItem(cred, idString);
    console.log("wrote to local storage");
    }
    else {
    // use a cookie
    cookie(cred, idString, {expires: 60});
    console.log("wrote a cookie");
    }
}

function supports_local_storage() {
    try {
        return "localStorage" in window && window["localStorage"] !== null;
    } catch (e) {
        return false;
    }
}

function makeActionButtonDiv() {
    $ ( document ).ready(function() {
        $("#titleDiv").after("<div id='action-buttons' class='btn-group btn-group-justified' role='group' style='width: 100%;'></div>");

    });
    var buttons =
        [{
            button: 'Contacted' ,
            txtColor: 'green',
            code: 1,
            glyphs: "glyphicon glyphicon-ok-sign"
        },{
            button: 'Attempted' ,
            txtColor: 'gold',
            code: 2,
            glyphs: "glyphicon glyphicon-question-sign"
        },{
            button: 'Not Contacted' ,
            txtColor: 'red',
            code: 3,
            glyphs: "glyphicon glyphicon-remove-sign"
        }, {
            button: 'Other',
            txtColor: 'blue',
            code: 4,
            glyphs: "glyphicon glyphicon-info-sign"
        }];

    $.each( buttons, function(key, value) {
        var btnStyle = {
            "color": value.txtColor,
            "background-color": "rgb(204,204,204)"
        }
        var test = $('<button/>', {
            id: value.button.toLowerCase().replace(/\s/g, ''),
            class: 'btn btn-default',
            click: function() {
                $("button").not(this).removeClass("active disabled").css({"color": "","background-color":"white"})
                $(this).addClass("active disabled").css(btnStyle).blur();
                queryAGS(relatedObjectID,value.code);
            }
        }).html("<span class='" + value.glyphs + "'><p>" + value.button + "</p></span>");
        $(".btn-group").append($(test));
    });
    $(".btn-default").wrap("<div class='btn-group'></div>");
}

var statusQueryUpdate = function(eid) {
    statusQueryTask = new esri.tasks.QueryTask(ReactFSTable);
    statusQuery = new esri.tasks.Query();
    statusQuery.outFields = ["OBJECTID","EID", "CONTACTED", "ACTIVE"];

    statusQuery.where = "EID=" + eid + " and ACTIVE = 'Yes'";
    var statusObj = statusQueryTask.execute(statusQuery, function(results){
        //console.log(results);
    });
    return statusObj;
}

function updateBtnStatus(contacted) {
    switch (contacted) {
        case 1:
            $("#contacted").addClass("active disabled").css({"color":"green", "background-color":"rgb(204,204,204)"});
            $("#attempted, #notcontacted, #other").css({"color":"black", "background-color":"white"}).removeClass("active disabled");
            break;
        case 2:
            $("#attempted").addClass("active disabled").css({"color": "gold", "background-color":"rgb(204,204,204)"});
            $("#contacted, #notcontacted, #other").css({"color":"black", "background-color":"white"}).removeClass("active disabled");
            break;
        case 3:
            $("#notcontacted").addClass("active disabled").css({"color": "red", "background-color":"rgb(204,204,204)"});
            $("#attempted, #contacted, #other").css({"color":"black", "background-color":"white"}).removeClass("active disabled");
            break;
        case 4:
            $("#other").addClass("active disabled").css({"color": "blue", "background-color":"rgb(204,204,204)"});
            $("#attempted, #notcontacted, #contacted").css({"color":"black", "background-color":"white"}).removeClass("active disabled");
            break;
        default:
            break;
    }
}
});
