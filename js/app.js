var map, circlePath;
var markers = [], circles = [];

/* ================================================
// # Event handlers
// ============================================= */
// Toggle GeoJSON viewer. 
document.querySelector('#toggleResult').addEventListener('click', function() {
    var resultBox = document.querySelector('.result-box');
    resultBox.classList.remove('no-animation');
    resultBox.classList.toggle('expanded');
});

/* ================================================
// # Tippy (Tooltip) initializations
// ============================================= */
tippy('.result-box .action', {
    position: 'left',
    arrow: true,
    animation: 'shift',
    size: 'small'
});

const tipRadiusSlider = tippy('#radiusSlider', {
    dynamicTitle: true,
    position: 'bottom',
    arrow: true,
    animation: 'shift',
    size: 'small'
});
const el = document.querySelector('#radiusSlider');
const popper = tipRadiusSlider.getPopperElement(el)

/* ================================================
// # Update circle radius
// ============================================= */
function updateRadius(slider) {
    console.log(slider);
    slider.title = 'Radius (in miles): ' + slider.value;

    tipRadiusSlider.show(popper);

    var mile = 1609.34;
    console.log('Updated circle to a ' + slider.value + ' mile radius');

    // Update the radius of the circle.
    circles.forEach(function(circle) {
        circle.setRadius(mile * slider.value);
    });

    generateGeoJSON();
}


/* ================================================
// # Initialize Google Map.
// ============================================= */
function initMap() {
    // Basic configurations.
    map = new google.maps.Map(document.getElementById('googleMap'), {
        // Big Ben
        center: {lat: 51.500358, lng: -0.125506},

        // Calicut
        // center: {lat: 11.264076, lng: 75.777509},
        zoom: 16,
        mapTypeId: 'terrain'
    });

    // Add SearchBox for autocompleting search terms.
    var addressInput = document.getElementById('addressInput');
    var searchBox = new google.maps.places.SearchBox(addressInput);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(addressInput);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
        // console.log('Bounds = ');
        // console.log(map.getBounds());
        searchBox.setBounds(map.getBounds());
    }); 

    searchBox.addListener('places_changed', function() {
        handlePlaceSelection(searchBox);
    });
}

/* ================================================
// # Helper functions.
// ============================================= */
function handlePlaceSelection(searchBox) {
    // Get all places associated with the selection. 
    var places = searchBox.getPlaces();

    if(places.length == 0) {
        console.log('No matching places found');
        return;
    }

    // Clear the map of the previous data.
    clearMap();

    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
        // Create a marker for the current place.
        markers.push(new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name
        }));

        // Draw a circle around the current marker. 
        // Radius is in meters.
        circles.push(new google.maps.Circle({
            strokeColor: '#0288D1',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#29B6F6',
            fillOpacity: 0.35,
            map: map,
            center: place.geometry.location,
            radius: 1609.34
        }));

        if (place.geometry.viewport) {
            bounds.union(place.geometry.viewport);
        } else {
            bounds.extend(place.geometry.location);
        }
    });

    generateGeoJSON();
    map.fitBounds(bounds);

    // Enable the circle radius slider.
    document.querySelector('#radiusSlider').classList.remove('hidden');
    // Show the GeoJSON result box.
    document.querySelector('.result-box').classList.remove('hidden');
}

function generateGeoJSON() {
    var geoJson = {
        "type": 'FeatureCollection',
        "features": []
    };

    circles.forEach(function(circle) {
        var feature = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[]]
            }
        };
        circlePath = getCirclePath(circle); 
        circlePath.forEach(function(coordinates) {
            feature.geometry.coordinates[0].push([
                // Colloquially we say "lat long" but written 
                // it's "long,lat", following the long standing convention
                // that X is the horizontal axis and Y the vertical.
                coordinates.lng(),
                coordinates.lat()
                ]);
        });
        
        // Since the first and last coordinates must be the same. Assign it as the last
        // coordinate. 
        feature.geometry.coordinates[0].push(feature.geometry.coordinates[0][0]);

        geoJson.features.push(feature);

    });

    var text = document.querySelector('#geoJsonResult');
    text.innerHTML = JSON.stringify(geoJson);
    console.log('Generated GeoJSON');
}

function clearMap() {
    clearMarkers();
    clearCircles();
}

function clearMarkers() {
    // Clear out the old markers.
    markers.forEach(function(marker) {
        marker.setMap(null);
    });
    markers = [];
    console.log('Markers cleared');
}

function clearCircles() {
    // Clear out the old circles. 
    circles.forEach(function(circle) {
        circle.setMap(null);
    });
    circles = [];
    console.log('Circles cleared');
}

function getCirclePath(circle) {
    var numPts = 512;
    var path = [];
    for (var i = 0; i < numPts; i++) {
        path.push(google.maps.geometry.spherical.computeOffset(
            circle.getCenter(), circle.getRadius(), i * 360 / numPts)
        );
    }
    return path;
}