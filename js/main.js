

// Styling Variables
// We are doing only sequential so only need the ones that have levels fromm 3 to 9
var chloroplethValidColorOptions = [
    'Blues', 'Oranges', 'Reds', 'Greys',
    'BuGn', 'PuBuGn', 'PuBu',
    'BuPu', 'RdPu', 'PuRd',
    'OrRd', 'YlOrRd', 'YlOrBr',
    'Purples', 'YlGn', 'Greens',
    'YlGnBu', 'GnBu'
];
// Let populate the color selection stuff
var $colorSelector = $('#color_scheme');

chloroplethValidColorOptions.forEach(function (colorName) {
    $colorSelector.append('<option value="' + colorName + '">' + colorName + '</option>');
});


var chloroplethLegendSymbols = [1, 2, 3];// Dummy values to make the initial length 3
var chloroplethSelectedColor = chloroplethValidColorOptions[0];// Default
var chloroplethValidVariables = ['connectivity', 'no_of_bus_routes', 'no_of_stops', 'route_len', 'route_den'];
var chloroplethSelectedVariable = 'connectivity';// default


function getColorForChloropleth(feature) {

    var props = feature.properties;

    var colors = colorbrewer[chloroplethSelectedColor][chloroplethLegendSymbols.length];
    var chloroplethVariableValue = props[chloroplethSelectedVariable];

    var index = 0;
    var colorToReturn = null;
    for (index = 0; index < chloroplethLegendSymbols.length; index++) {
        var bounds = chloroplethLegendSymbols[index];
        if (chloroplethVariableValue >= bounds.from && chloroplethVariableValue <= bounds.to) {
            colorToReturn = colors[index];
            break;
        }
    }
    colorToReturn = colorToReturn == null ? colors[(chloroplethLegendSymbols.length - 1)] : colorToReturn;

    return colorToReturn;
}


$('#update_chloropleth_settings').on('click', function (event) {
    event.stopPropagation();
    // set the value of the selected color
    chloroplethSelectedColor = $('#color_scheme').val();
    chloroplethSelectedVariable = $('#z_field').val();


    updateChloroplethSettings();
    chloroplethLegend.update();
});

function updateChloroplethSettings() {
    // The is the chloropleth variable, zIndex is just another name
    var zIndex = $('#z_field').val();
    var classification = $('#classification').val();
    var no_of_breaks = $('#no_of_breaks').val();

    // Just to make sure it does not go above 9
    var geojson;
    if (classification == 'Jenks') {
        geojson = geocolor.jenks(subZonesData, zIndex, no_of_breaks, colorbrewer[chloroplethSelectedColor][no_of_breaks], {});
    } else if (classification == 'Quantiles') {
        geojson = geocolor.quantiles(subZonesData, zIndex, no_of_breaks, colorbrewer[chloroplethSelectedColor][no_of_breaks], {});
    } else { // Should be equal interval
        // No of breaks -1 because equal intervals always gives an extra interval, should be a bug in the plugin
        geojson = geocolor.equalIntervals(subZonesData, zIndex, no_of_breaks - 1, colorbrewer[chloroplethSelectedColor][no_of_breaks], {});
    }
    chloroplethLegendSymbols = geojson.legend.symbols;
    console.log(chloroplethLegendSymbols);
    // Now lets update the
    subZonesGeoJson.setStyle(chloroplethStyle);
}


function updateChloroplethLegend (){
    // Empty the legends first
    $('#legend').empty();
    // Labels
    var legend = '<h5>' + chloroplethSelectedVariable + '</h5>';
    legend += '<div id="labels">';
    chloroplethLegendSymbols.forEach(function (symbol) {
        legend += '<div>' + parseFloat(symbol.from).toFixed(2) + ' - ' + parseFloat(symbol.to).toFixed(2) + '</div>';
    });
    legend += '</div>';

    // Symbols
    legend += '<div id="symbols">';
    var colors = colorbrewer[chloroplethSelectedColor][chloroplethLegendSymbols.length];
    var index  = 0;
    for(index  =0 ; index < chloroplethLegendSymbols.length ; index++){
        legend += '<div class="symbolBox" style="background-color:' + colors[index]+ '"></div>';
    }

    legend += '</div>';
    $('#legend').append(legend);
    $('#legend').show();

}





// Set the map
var map = L.map('map', {zoomControl: true, zoomSliderControl: true}).setView([1.355312, 103.840068], 12);

// Base layers
var osmStandardBaseMap = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
var osmBlackAndWhiteBaseMap = L.tileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png');

// Add the base layers to the map
osmBlackAndWhiteBaseMap.addTo(map);
osmStandardBaseMap.addTo(map);


// Chloropleth information container
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


function chloroplethStyle(feature) {
    return {
        fillColor: getColorForChloropleth(feature),
        color: '#000',
        weight: 1,
        opacity: feature.properties.transp_qgis2leaf,
        fillOpacity: feature.properties.transp_qgis2leaf
    }
}


var subZonesGeoJson =
    L.geoJson(subZonesData, {
        style: chloroplethStyle,
        onEachFeature: function (feature, layer) {
            layer.on({
                mouseover: showSubzoneInfoInInfoPanel,
                mouseout: resetSubzoneStyle,
                click: zoomToFeature
            });
        }
    });


function resetSubzoneStyle(e) {
    subZonesGeoJson.resetStyle(e.target);
    info.update();
}

function showSubzoneInfoInInfoPanel(e) {
    var layer = e.target;

    layer.setStyle({
        color: 'white',
        dashArray: 2,
        weight: 2
    });

    var feature = layer.feature;
    var props = feature.properties;
    var htmlContent = '<h4> District Information </h4>' +
        '<b>' + props.subzone_n + '</b><br/><br/>' +
        'Inter Connectivity: ' + props.connectivity + ' <br/>' + ' <br/>' +
        'But Route Density:  ' + props.route_den + ' m/m<sup>2</sup><br/>' + ' <br/>' +
        'But routes total length:  ' + props.route_len + ' m <br/>' + ' <br/>' +
        'No of bus routes :  ' + props.no_of_bus_routes + ' <br/>' + ' <br/>' +
        'No of Bus stops:  ' + props.no_of_stops + ' <br/>';
    info.update(htmlContent);
}

subZonesGeoJson.addTo(map);
// Update settings
updateChloroplethSettings();


// Only add the legend after the first update of the chloro map
var chloroplethLegend = L.control({position:'bottomright'});
chloroplethLegend.onAdd = function(map){
    this._div = L.DomUtil.create('div' );
    this._div.id =  'legend';
    return this._div;
};
chloroplethLegend.update = updateChloroplethLegend;
chloroplethLegend.addTo(map);
chloroplethLegend.update();

var propotinateMapSubZone =
    L.geoJson(subZonesCentroidData, {
        pointToLayer: function (feature, latLng) {
            return L.circleMarker(latLng, {
                radius: feature.properties.no_of_stop / 5,
                weight: 3,
                opacity: 0.6,
                fillOpacity: 0.6,
                fillColor: '#1f78b4',
                color: "white"// Border color
            });
        }
    });


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


// baseMaps key value pair to be added in the layer group
var baseMaps = {

    'OSM Black & White': osmBlackAndWhiteBaseMap,
    'OSM Standard': osmStandardBaseMap
};
// Add the layer controls
L.control.layers(baseMaps,
    {
        'Bus Routes': busRoutesGeoJson,
        'Bus Stops': markers,
        'Chloropleth': subZonesGeoJson,
        'Total No of Bust stops': propotinateMapSubZone
    }, {collapsed: true, position: 'topleft'}).addTo(map);

L.control.scale({maxWidth: 200}).addTo(map);
new L.Control.GeoSearch({
    provider: new L.GeoSearch.Provider.OpenStreetMap(),
    position: 'topcenter',
    showMarker: true
}).addTo(map);






//Listeners

//Listening to Overlay Layer Add
map.on('overlayadd', function(a) {
    if(a.name == "Chloropleth") {
        $('#legend').show();
        $('#chloropleth_controls').show();
    }

    if(a.name == "Bus Stops"){
        $('#bus_stop_layer_controls').show();
    }

});



//Listening to Overlay Layer Remove
map.on('overlayremove', function(a) {
    console.log(a);
    if(a.name == "Chloropleth") {
        $('#legend').hide();
        $('#chloropleth_controls').hide();
    }
    if(a.name == "Bus Stops"){
        $('#bus_stop_layer_controls').hide();
    }


});
