/**
 * Created by Ben on 18/2/15.
 */

// Set the map

//var map = L.map('map', { zoomControl:true }).fitBounds([[1.0767513637,103.591111131],[1.57579761917,104.103108808]]);
var map = L.map('map', {zoomControl: true, zoomSliderControl: true}).setView([1.355312, 103.840068], 12);
// group for the  vectors
var feature_group = new L.featureGroup([]);

var osmStandardBaseMap = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
var osmBlackAndWhiteBaseMap = L.tileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png');

// Add the base layers to the map

osmBlackAndWhiteBaseMap.addTo(map);
osmStandardBaseMap.addTo(map);
// baseMaps key value pair to be added in the layer group
var baseMaps = {

    'OSM Black & White': osmBlackAndWhiteBaseMap,
    'OSM Standard': osmStandardBaseMap
};

// General Information container control
var info = L.control({position: 'topright'});
info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

info.update = function (htmlContent) {
    this._div.innerHTML = htmlContent ? htmlContent : '<h4> Information Panel</h4> Hover over  the features to see details';

};

info.addTo(map);


// Lets deal with the basic layers first

/**
 * Reset the highlight the feature of  busroute
 * @param e
 */
function highlightFeatureBusRoute(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 2,
        color: 'red',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
    info.update('<h4>Bus Routes</h4>' +
    ' Service Number:' + layer.feature.properties.svc_num + ' <br/>' +
    ' Service Direction: ' + layer.feature.properties.svc_dir);
}

var busRoutesGeoJson;
/**
 * Reset the style of the BusRoute
 * @param e
 */
function resetHighlightBusRoute(e) {
    busRoutesGeoJson.resetStyle(e.target);
    info.update();
}

function onEachFeatureBusRoute(feature, layer) {
    layer.on({
        mouseover: highlightFeatureBusRoute,
        mouseout: resetHighlightBusRoute,
        click: zoomToFeature
    });
}
function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}
// Define the bus route layer
busRoutesGeoJson = L.geoJson(busRouteData, {
    style: styleBusRoute,
    onEachFeature: onEachFeatureBusRoute
});


busRoutesGeoJson.addTo(map);

function styleBusRoute(feature) {
    return {
        opacity: 1,
        weight: 1,
        color: '#666'
    };
}


// Lets deal with the  bus stops layer , with custom icons and stuff

var markers = L.markerClusterGroup(
    {
        maxClusterRadius: 100
    }
);


// TODO create the icon selector for the bus stop
//TODO The color could also be determined  by the no of bus services served
var busStopsGeoJson =
    L.geoJson(busStopsData, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
                icon: L.AwesomeMarkers.icon({
                    icon: "bus",
                    prefix: 'fa',
                    iconColor: 'white',
                    markerColor: 'red'
                })
            });
        },
        onEachFeature: function (feature, layer) {
            var popupContent = '<table>' +

                '<tr><th scope="row">Bus Stop Number</th><td>'
                + feature.properties['BUS_STOP_N']
                + '</td></tr><tr><th scope="row">Bus Roof Number</th><td>'
                + feature.properties['BUS_ROOF_N']
                + '</td></tr><tr><th scope="row">Location</th><td>'
                + feature.properties['LOC_DESC']
                + '</td></tr>' +
                '</table>';
            layer.bindPopup(popupContent);
        }
    });

markers.addLayer(busStopsGeoJson);
markers.addTo(map);


//NOW LETS DEAL WITH THE CHLOROPETH MAPS

// WE will use a single chloropleth with ablity to choose different attributes to determine the color
// TODO  make click to zoom to the area, make is dashed, allow to choose the attribute, allow the change the range

var subZonesGeoJson =
    L.geoJson(subZonesData, {
        style: function (feature) {
            return {
                fillColor: feature.properties.color_qgis2leaf,
                color: '#000',
                weight: 1,
                opacity: feature.properties.transp_qgis2leaf,
                fillOpacity: feature.properties.transp_qgis2leaf
            };
        }
    });
subZonesGeoJson.addTo(map);


// The propotionate map

//    var propotionateMapBusStops  =
//            L.geoJson(busStopsData,{
//                pointToLayer: function(feature,latLng){
//                    return L.circleMarker(latLng, {
//                        radius: feature.properties.services/2,
//                        weight:2,
//                        fillColor:'#1f78b4',
//                        color: "white"// Border color
//                    });
//                }
//            });
//    propotionateMapBusStops.addTo(map);

var propotinateMapSubZone =
    L.geoJson(subZonesCentroidData, {
        pointToLayer: function (feature, latLng) {
            return L.circleMarker(latLng, {
                radius: feature.properties.no_of_stop / 5,
                weight: 3,
                opacity: 1,
                fillOpacity: 1,
                fillColor: '#1f78b4',
                color: "white"// Border color
            });
        }
    });
propotinateMapSubZone.addTo(map);


// Additional propotionate map based on subregion

//var propotionateSubRegionTotalNumberOfBusStops =

// Additional Plugins

// domoritz/leaflet-locatecontrol
L.control.locate({
    position: 'topleft',  // set the location of the control
    drawCircle: true,  // controls whether a circle is drawn that shows the uncertainty about the location
    follow: false,  // follow the user's location
    setView: true, // automatically sets the map view to the user's location, enabled if `follow` is true
    stopFollowingOnDrag: false, // stop following when the map is dragged if `follow` is true (deprecated, see below)
    circleStyle: {},  // change the style of the circle around the user's location
    markerStyle: {},
    followCircleStyle: {},  // set difference for the style of the circle around the user's location while following
    followMarkerStyle: {},
    circlePadding: [0, 0], // padding around accuracy circle, value is passed to setBounds
    metric: true,  // use metric or imperial units
    onLocationError: function (err) {
        alert(err.message)
    },  // define an error callback function
    onLocationOutsideMapBounds: function (context) { // called when outside map boundaries
        alert(context.options.strings.outsideMapBoundsMsg);
    },
    strings: {
        title: "Show me where I am",  // title of the locat control
        popup: "You are within {distance} {unit} from this point",  // text to appear if user clicks on circle
        outsideMapBoundsMsg: "You seem located outside the boundaries of the map" // default message for onLocationOutsideMapBounds
    },
    locateOptions: {}  // define location options e.g enableHighAccuracy: true
}).addTo(map);


// Add the layer controls
L.control.layers(baseMaps,
    {
        'Bus Routes': busRoutesGeoJson,
        'Bus Stops': markers,
        'Chloropleth Subzone Connectivity': subZonesGeoJson,
        //'Bus stop Propotionate' : propotionateMapBusStops,
        'Total No of Bust stops': propotinateMapSubZone
    }, {collapsed: false, position: 'topleft'}).addTo(map);


new L.Control.GeoSearch({
    provider: new L.GeoSearch.Provider.OpenStreetMap(),
    position: 'topcenter',
    showMarker: true
}).addTo(map);


//  TODO  Zoom to layer control