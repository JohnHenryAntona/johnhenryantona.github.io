var MapRenderer = {
    map: null,
    infoWindow: null,
    markers: [],
    markerGroups: {restaurants: []},
    markerCluster: null,
    bounds: null,
    service: null,
    place: null,
    mapOptions: {
        center: {
            lat: 10.3180285, //10.3157,//
            lng: 123.8901931, //123.8854,//
        },
        zoom: 15
    },
    iconInfo: null,
    specialties: ['bar','café','buffet','pizza','burger','lechon','barbecue','lantaw','seafood','vegetarian','filipino','indian','japanese','italian','mexican'],
    filters: {
        bar: false,
        café: false,
        buffet: false,
        lechon: false,
        barbecue: false,
        lantaw: false,
        seafood: false,
        japanese: false,
        italian: false,
        mexican: false,
        inbound: false,
        outbound: false
    },
    currentFilters: [],
    filterStatus: 0,
    circles: [],
    listeners: [],
    drawerPanel: null,
    drawingModes: null,
    drawingModesDefault: [],
    moreButton: null,
    pagination: null,
    getNextPage: null,
    directionsDisplay : null,
    directionsService: null,
    currentPosition: null,
    init: function() {
        this.map = new google.maps.Map(document.getElementById('map'), this.mapOptions);
        this.infoWindow = new google.maps.InfoWindow();
        this.bounds = new google.maps.LatLngBounds();
        this.service = new google.maps.places.PlacesService(this.map);
        this.directionsDisplay = new google.maps.DirectionsRenderer;
        this.directionsService = new google.maps.DirectionsService;

        this.directionsDisplay.setMap(this.map);
        
        // var getNextPage = null;
        var _self = MapRenderer;
        this.moreButton = document.getElementById('more');
        this.moreButton.onclick = function() {
          _self.moreButton.disabled = true;
          if (_self.getNextPage) _self.pagination.nextPage();
        };

        this.service.textSearch({
            location: this.mapOptions.center,
            radius: 15000,
            keyword: 'restaurant+in+cebu',
            query: 'restaurant',
            type: ['restaurant', 'food']
        }, this.callback);

        // Create the search box and link it to the UI element.
        var input = document.getElementById('search-input'),
        request;
        this.searchBox = new google.maps.places.SearchBox(input);

        this.loadDrawer();
        // Bias the SearchBox results towards current map's viewport.
        this.listenBoundsChange();
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        this.listenPlacesChange();

        if (navigator.geolocation) {
            var _self = MapRenderer;
            navigator.geolocation.getCurrentPosition(function(position) {
                _self.currentPosition = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
            });
        }
    },
    calculateAndDisplayRoute: function(directionsService, directionsDisplay, place) {
        var _self = MapRenderer;
        this.directionsService.route({
          origin: this.currentPosition,  // Haight.
          destination: {lat: place.geometry.location.lat(), lng: place.geometry.location.lng()},  // Ocean Beach.
          // Note that Javascript allows us to access the constant
          // using square brackets and a string value as its
          // "property."
          travelMode: google.maps.TravelMode['DRIVING']
        }, function(response, status) {
          if (status == 'OK') {
            _self.directionsDisplay.setDirections(response);
          } else {
            window.alert('Directions request failed due to ' + status);
          }
        });
    },
    clickNextPage: function(){
        if ( jQuery('#more').attr('disabled') != undefined ) {
            setTimeout(function() {
                jQuery('#more').click();
            }, 1000);
        }
    },
    callback: function(results, status, pagination) {
        this.bounds = new google.maps.LatLngBounds();
        var _self = MapRenderer;
        _self.pagination = pagination;
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            console.log(results);
            for (var i = 0; i < results.length; i++) {
                var details = _self.service.getDetails({
                    placeId: results[i].place_id
                }, function(place, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        _self.place = place;
                    }
                });
                if (!results[i].geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }
                // Create markers and plot to map
                _self.createMarker(results[i], i);
                _self.moreButton.disabled = !pagination.hasNextPage;
                _self.getNextPage = pagination.hasNextPage && function() {
                    _self.getNextPage = true;
                    sleep:2;
                    pagination.nextPage();
                };
                _self.bounds.extend(results[i].geometry.location);
            }

            _self.map.fitBounds(_self.bounds);
        }

        setTimeout(function() {
            if ( jQuery('#more').attr('disabled') == undefined ) {
                _self.pagination.nextPage();
                jQuery('#more').trigger('click');
            }
        },1000);
    },
    createMarker: function(place, i) {
        var _self = MapRenderer;
        // var details = _self.service.getDetails({
        //     placeId: place.place_id
        // }, function(place, status) {
        //     if (status === google.maps.places.PlacesServiceStatus.OK) {
        //         _self.place = place;
        //     }
        // });
        _self.place = place;
        _self.iconInfo = {
            url: 'assets/images/icon.png',
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(50, 50)
        };
        var marker = new google.maps.Marker({
            map: _self.map,
            icon: _self.iconInfo,
            title: place.name,
            position: place.geometry.location,
            animation: google.maps.Animation.DROP,
        });

        _self.place = marker;
        marker.filter = 'all';
        marker.properties = {};
        marker.properties.inbound = false;
        marker.properties.outbound = false;
        marker.geometry = place.geometry;
        marker.place_id = place.place_id;
        _self.specialties.forEach(function(index){
            if ( _self.place.title.indexOf(camelize(index)) > -1 ) {
                marker.filter = index;
                // japanese
                if ( _self.place.title.indexOf('Yakiniku') > -1 || _self.place.title.indexOf('Tokyo') || _self.place.title.indexOf('Nagomi') && index == 'japanese') {
                    marker.filter = index;
                }
            }
            // cafe
            if ( _self.place.title.indexOf('Cafe') > -1 && index == 'café') {
                marker.filter = index;
            }
            // indian
            if ( _self.place.title.indexOf('Sbarro') > -1 && index == 'indian') {
                marker.filter = index;
            }
            // pizza
            if ( _self.place.title.indexOf('Pizz') > -1 && index == 'pizza') {
                marker.filter = index;
            }
        });
        _self.place = null;
        console.log(marker.title, marker.filter);

        _self.markerGroups.restaurants.push(marker);

        _self.bounds.extend(marker.geometry.location);

        if (marker.geometry.viewport) {
            // Only geocodes have viewport.
            _self.bounds.union(place.geometry.viewport);
        } else {
            _self.bounds.extend(place.geometry.location);
        }

        // Add custom css on info window and render contents
        _self.stylizeInfoWindow();
        var currentLocation = 'current+location';
        marker.infoWindow = _self.createInfoWindow(place, currentLocation);

        google.maps.event.addListener(marker, 'click', function() {
            var _this = this;
            
            console.log(_this);
            var details = _self.service.getDetails({
                placeId: place.place_id
            }, function(place, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    _self.place = place;
                    marker = new google.maps.Marker({
                        map: _self.map,
                        icon: _self.iconInfo,
                        title: place.name,
                        position: place.geometry.location,
                    });
                    _self.infoWindow.setContent(_self.createInfoWindow(place, currentLocation));
                    _self.infoWindow.open(_self.map, _this);
                    // console.log(place);
                    document.getElementById('get_directions').addEventListener('click', function() {
                        _self.calculateAndDisplayRoute(_self.directionsService, _self.directionsDisplay,place);
                    });
                }
            });

        });

         

        _self.specialties.forEach(function(index){
            google.maps.event.addDomListener(document.getElementById(index),
                'click', function() {
                    var value = jQuery(this).val();
                    if ( jQuery('#'+value.toLowerCase()+':checked').length == 0 ) {
                        _self.currentFilters.pop(index);
                    } else {
                        _self.currentFilters.push(index);
                    }
                    _self.filterStatus = 0;
                    if ( !_self.filters[index] ) {
                      _self.filters[index] = true;
                    } else {
                        if ( _self.currentFilters.indexOf(index) > -1 ) {
                            _self.filters[index] = true;
                        } else {
                            if ( _self.filterStatus == 0 ) {
                                _self.filters[index] = false;
                                _self.currentFilters.pop(index);
                            }
                        }
                    }
                    if ( _self.filterStatus == 0 ) {
                        _self.toggleMarkerGroup(index);
                    }
            });
        });
    },
    createInfoWindow: function(place, currentLocation) {
        // var content = "<div id='iw-container'><div class='iw-title'><b>" + place.name + "</b></div><div class='iw-content'><span>" + place.formatted_address + "</span></br><a href='https://maps.google.com/maps?saddr=" + currentLocation + "&daddr=" + place.formatted_address + "' target='_blank'>Directions</a></div><div>";
        var content = "<div id='iw-container'><div class='iw-title'><b>" + place.name + "</b></div><div class='iw-content'><span>" + place.formatted_address + "</span></br><div id='get_directions' style='color:blue;'onlick='MapRenderer.calculateAndDisplayRoute(MapRenderer.directionsService, MapRenderer.directionsDisplay, place)'>Get Directions</div></div><div>";
        return content;
    },
    stylizeInfoWindow: function() {
        google.maps.event.addListener(this.infoWindow, 'domready', function() {
            var iwOuter = jQuery('.gm-style-iw');
            iwOuter.css({
                'font-size': '16px'
            });
            var iwCloseBtn = iwOuter.next();
            var iwBackground = iwOuter.prev();

            iwBackground.children(':nth-child(3)').find('div').children().css({'box-shadow': ' rgba(178, 178, 178, 0.6) 0px 1px'});
            iwBackground.children(':nth-child(2)').css({'display' : 'none'});
            iwBackground.children(':nth-child(4)').css({'display' : 'none'});

            iwCloseBtn.css({
                opacity: '1',
                right: '26px', top: '3px',
                border: '7px solid #b2b6b5',
                width: '26px',
                height: '26px',
                'border-radius': '50%',
                'box-shadow': '0 0 5px #b2b6b5'
            });
            iwCloseBtn.mouseout(function(){
                jQuery(this).css({opacity: '1'});
            });
        });
    },
    clearOldMarkers: function() {
        this.markers.forEach(function(marker) {
            marker.setMap(null);
        });
        this.markers = [];
    },
    listenBoundsChange: function() {
        this.searchBox.setBounds(this.map.getBounds());
    },
    listenPlacesChange: function() {
        // Trick this to _self
        var _self = MapRenderer;
        _self.searchBox.addListener('places_changed', function() {
            var places = _self.searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            // Clear out the old markers.
            _self.clearOldMarkers();

            // For each place, get the icon, name and location.
            _self.bounds = new google.maps.LatLngBounds();
            places.forEach(function(place) {
                var details = _self.service.getDetails({
                    placeId: place.place_id
                }, function(place, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        _self.place = place;
                    }
                });
                console.log(place.geometry);
                if (!place.geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }
                // Create markers and plot to map
                _self.createMarker(place);
            });
            _self.map.fitBounds(_self.bounds);
        });
    },
    toggleMarkerGroup: function(filter) {
        var _self = MapRenderer;
        this.markerGroups.restaurants.forEach(function(i){
            var marker = i;
            if ( _self.currentFilters.indexOf(i.filter) > -1 || _self.currentFilters.length == 0 ) {
                marker.setVisible(true);
            } else {
                marker.setVisible(false);
            }

        });
        this.filterStatus = 1;
    },
    loadDrawer: function() {
        return this.createPanel().show();
    },
    isMarkerInbound: function(circle, marker) {
        bounds = circle.getBounds();
        markPosition = marker.position;
        latLngPos = new google.maps.LatLng(marker.position.lat(), marker.position.lng());
        /**
         * A google.maps.LatLngBounds is a rectangle.
         * You need a polygon "contains" function.
         * For a circle this can be reduced to testing whether
         * the point is less than the radius away from the center.
         */
        distanceBetween = (google.maps.geometry.spherical.computeDistanceBetween(marker.getPosition(), circle.getCenter()) <= circle.getRadius());
        return distanceBetween;
        // return bounds.contains(latLngPos);
    },
    resetFilters: function() {
        for (option in this.filters) {
            if (this.filters[option]) {
                this.filters[option] = false;
            }
        }
        this.filter_markers(this.markerGroups.restaurants, false);
    },
    filter_markers: function(markers = null, override = true) {
        set_filters = this.get_set_options()
        // for each marker, check to see if all required options are set
        if (markers != null) {
            markers = markers;
        } else {
            markers = this.markerGroups;
        }
        for (i = 0; i < markers.length; i++) {
            marker = markers[i];
            // start the filter check assuming the marker will be displayed
            // if any of the required features are missing, set 'keep' to false
            // to discard this marker
            keep = true
            for (opt = 0; opt < set_filters.length; opt++) {
                if (!marker.properties[set_filters[opt]] && override) {
                    keep = false;
                }
            }
            this.displayMarker(marker, keep);
        }
    },
    get_set_options: function() {
        ret_array = []
        for (option in this.filters) {
            if (this.filters[option]) {
                ret_array.push(option)
            }
        }
        return ret_array;
    },
    displayMarker: function(marker, show = true) {
        marker.setVisible(show);
        if (show) {
            if (Object.size(marker.MarkerLabel)) {
                jQuery(marker.MarkerLabel.div).show();
            }
        } else {
            if (Object.size(marker.MarkerLabel)) {
                jQuery(marker.MarkerLabel.div).hide();
            }
            // marker.infoWindow.close();
        }
    },
    displayInboundMarkers: function(show = true) {
        if (!Object.size(this.circles)) {
            return false;
        }
        var _self = MapRenderer;
        circle = this.circles[0];
        jQuery.each(this.markerGroups.restaurants, function() {
            if (_self.isMarkerInbound(circle, this)) {
                _self.displayMarker(this, show);
            }
        });
    },
    displayOutboundMarkers: function(show = true) {
        if (!Object.size(this.circles)) {
            return false;
        }
        var _self = MapRenderer;
        circle = this.circles[0];
        jQuery.each(this.markerGroups.restaurants, function() {
            if (!_self.isMarkerInbound(circle, this)) {
                _self.displayMarker(this, show);
            }
        });
    },
    clusterMarkers: function(markers) {
        this.markerCluster = new MarkerClusterer(this.map, markers, {
            ignoreHiddenMarkers: true,
            imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
        });
        this.markerCluster.onCreateComplete = function(markers){
            var _self = MapRenderer;
            if (!_self.hasCircles() || _self.markerCluster.new_markers) {
                _self.markerCluster.new_markers = false;
                _self.toggleClusters();
            }
        };
    },
    clusterRepaint: function(){
        if (this.markerCluster) {
            this.markerCluster.repaint();
        }
    },
    createPanel: function() {
        this.drawingModes = [google.maps.drawing.OverlayType.CIRCLE];
        this.drawingModesDefault = [
            google.maps.drawing.OverlayType.MARKER,
            google.maps.drawing.OverlayType.CIRCLE,
            google.maps.drawing.OverlayType.POLYGON,
            google.maps.drawing.OverlayType.POLYLINE,
            google.maps.drawing.OverlayType.RECTANGLE
          ];
        var drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: this.drawingModes
            },
            markerOptions: {
                icon: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png'
            },
            circleOptions: {
                clickable: false,
                editable: false,
                zIndex: 1,
                // metres
                radius: 100000,
                fillColor: '#fff',
                fillOpacity: .6,
                strokeColor: '#313131',
                strokeOpacity: .4,
                strokeWeight: .8
            }
        });
        var _self = MapRenderer;
        listener = google.maps.event.addListener(drawingManager, 'circlecomplete', function(shape){
            _self.onCircleComplete(shape, _self);
        });
        this.listeners.push(listener);
        this.drawerPanel = drawingManager;
        this.circles = [];
        return this;
    },
    show: function(){
        this.drawerPanel.setMap(this.map);
        this.displayCenterMarker(true);
        this.displayCircles(true);
        jQuery('[title="Stop drawing"]').trigger('click');
        return this;
    },
    hide: function(){
        this.drawerPanel.setMap(null);
        this.displayCenterMarker(false);
        this.displayCenterInfo(false);
        this.displayCircles(false);
        return this;
    },
    onCircleComplete: function(shape, _self){

        if (shape == null || (!(shape instanceof google.maps.Circle))) return;

        if (_self.circles.length) {
            _self.circles[0].setMap(null);
            _self.circles = [];
        }

        centerMarker = _self.createCenterMarker(shape);

        //push the circles onto the array
        _self.circles.push(shape);
        //reset filters
        _self.calibrateMarkersBoundings(_self.circles[0],_self.markerGroups.restaurants);
        jQuery('[title="Stop drawing"]').trigger('click');
    },
    createCenterMarker: function(shape){
        var _self = MapRenderer;
        centerMarker = new google.maps.Marker({
            position: shape.getCenter(),
            title: 'Location',
            map: this.map,
            draggable: true
        });
        centerInfo = this.createCenterInfo();
        // attach shape to marker
        shape.bindTo('center', centerMarker, 'position');

        // get some latLng object and Question if it's contained in the circle:
        marker_dragend = google.maps.event.addListener(centerMarker, 'dragend', function() {
            // latLngCenter = new google.maps.LatLng(centerMarker.position.lat(), centerMarker.position.lng());
            // bounds = centerMarker.getBounds();
            _self.calibrateMarkersBoundings(_self.circles[0],_self.markerGroups.restaurants);
        });

        _self.stylizeInfoWindow();
        marker_click = google.maps.event.addListener(centerMarker, 'click', function() {
            _self.infoWindow.setContent(_self.createInfoWindow(marker));
            centerInfo.open(_self.map, centerMarker);
        });

        marker_drag = google.maps.event.addListener(centerMarker, 'drag', function() {
            centerInfo.close();
        });

        //store listeners so we can unbind them later if needed
        this.listeners.push(marker_dragend);
        this.listeners.push(marker_click);
        this.listeners.push(marker_drag);

        if (Object.size(this.centerMarker)) {
            this.centerMarker.setMap(null);
        }
        this.centerMarker = centerMarker;
        return this.centerMarker;
    },
    createCenterInfo: function(){
        contentCenter = '<span class="infowin">Center Marker (draggable)</span>';
        centerInfo = new google.maps.InfoWindow({
            content: contentCenter
        });
        if (Object.size(this.centerInfo)) {
            this.centerInfo.setMap(null);
        }
        this.centerInfo = centerInfo;
        return this.centerInfo;
    },
    displayCenterMarker :function(show = true){
        if (Object.size(this.centerMarker)) {
            this.centerMarker.setVisible(show);
        }
    },
    displayCenterInfo :function(show = true){
        if (Object.size(this.centerInfo)) {
            if (show) {
                this.centerInfo.open(this.map, this.centerMarker);
            } else {
                this.centerInfo.close();
            }
        }
    },
    displayCircles: function(show = true){
        if (Object.size(this.circles)) {
            for (var key in this.circles) {
                this.circles[key].setVisible(show);
            }
        }
    },
    hasCircles: function(){
        return (!!Object.size(this.circles));
    },
    clearCircles: function(){
        if (this.circles.length) {
            this.circles[0].setMap(null);
            this.circles = [];
        }
        if (Object.size(this.centerMarker)) {
            this.centerMarker.setMap(null);
        }
    },
    calibrateMarkersBoundings: function(circle, markers) {
        var _self = MapRenderer;
        jQuery.each(markers, function(key, marker) {
            if (_self.isMarkerInbound(circle, marker)) {
                marker.properties.inbound = false;
                marker.properties.outbound = true;
            } else {
                marker.properties.inbound = true;
                marker.properties.outbound = false;
            }
        });

        this.resetFilters();
        this.displayOutboundMarkers(false);

        if (this.markerCluster == null) {
            this.clusterMarkers(_self.markerGroups.restaurants);
        }

        this.clusterRepaint();
        // this.clusterMarkers(this.markerGroups.restaurants);
    },
}

function camelize(str) {
    return str.toLowerCase().replace(/(?:(^.)|(\s+.))/g, function(match) {
        return match.charAt(match.length-1).toUpperCase();
    });
}

function initMap() {
    MapRenderer.init();
}

function toggleHeader(elm) {
    if (jQuery(elm).hasClass('active')) {
        jQuery(elm).removeClass('active');
        jQuery(elm).parent().find('.collapsible-body').show();
    } else {
        jQuery(elm).addClass('active');
        jQuery(elm).parent().find('.collapsible-body').hide();
    }
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};