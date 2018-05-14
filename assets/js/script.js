var MapRenderer = {
    map: null,
    infoWindow: null,
    markers: [],
    markerGroups: {restaurants: []},
    bounds: null,
    service: null,
    place: null,
    mapOptions: {
        center: {
            lat: 10.3180285, //10.3157,//
            lng: 123.8901931, //123.8854,//
        },
        zoom: 5
    },
    iconInfo: null,
    specialties: ['bar','café','buffet','pizza','burger','lechon','barbecue','lantaw','seafood','vegetarian','japanese','italian','mexican'],
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
    },
    currentFilters: [],
    filterStatus: 0,
    init: function() {
        this.map = new google.maps.Map(document.getElementById('map'), this.mapOptions);
        this.infoWindow = new google.maps.InfoWindow();
        this.bounds = new google.maps.LatLngBounds();
        this.service = new google.maps.places.PlacesService(this.map);
        this.service.textSearch({
            location: this.mapOptions.center,
            radius: 5000,
            query: 'restaurant',
            type: ['restaurant', 'food']
        }, this.callback);
        // Create the search box and link it to the UI element.
        var input = document.getElementById('search-input'),
        request;
        this.searchBox = new google.maps.places.SearchBox(input);
        var _self = MapRenderer;
        if (jQuery(input).val().match(/\S/)) {
            request = {
                query: jQuery(input).val()
            };
            if (_self.searchBox.getBounds()) {
                request.bounds = _self.searchBox.getBounds();
            }
            this.service.textSearch(request, function(places) {
            //set the places-property of the SearchBox
            //places_changed will be triggered automatically
                _self.searchBox.set('places', places || [])
            });
        }
        // Bias the SearchBox results towards current map's viewport.
        this.listenBoundsChange();
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        this.listenPlacesChange();
    },
    callback: function(results, status) {
        this.bounds = new google.maps.LatLngBounds();
        var _self = MapRenderer;
        if (status === google.maps.places.PlacesServiceStatus.OK) {
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
                _self.createMarker(results[i]);
                _self.bounds.extend(results[i].geometry.location);
                console.log(results[i], i);
            }
            _self.map.fitBounds(_self.bounds);
        }

    },
    createMarker: function(place) {
        var _self = MapRenderer;
        this.iconInfo = {
            url: 'assets/images/icon.png',
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(40, 40)
        };
        var marker = new google.maps.Marker({
            map: this.map,
            icon: this.iconInfo,
            title: place.name,
            position: place.geometry.location,
            animation: google.maps.Animation.DROP,
        });

        _self.place = marker;
        marker.filter = 'all';
        this.specialties.forEach(function(index){
            console.log(_self.place.title);
            if ( _self.place.title.indexOf(camelize(index)) > -1 ) {
                marker.filter = index;
                if ( _self.place.title.indexOf('Yakiniku') > -1 && index == 'japanese') {
                    marker.filter = index;
                }
            }
            if ( _self.place.title.indexOf('Cafe') > -1 && index == 'café') {
                marker.filter = index;
            }
        });
        _self.place = null;

        _self.markerGroups.restaurants.push(marker);

        _self.bounds.extend(marker.position);

        if (place.geometry.viewport) {
            // Only geocodes have viewport.
            _self.bounds.union(place.geometry.viewport);
        } else {
            _self.bounds.extend(place.geometry.location);
        }

        // Add custom css on info window and render contents
        _self.stylizeInfoWindow();

        var currentLocation = 'current+location';
        google.maps.event.addListener(marker, 'click', function() {
            _self.map.setZoom(12);
            _self.infoWindow.setContent("<div id='iw-container'><div class='iw-title'><b>" + place.name + "</b></div><div class='iw-content'><span>" + place.formatted_address + "</span></br><a href='https://maps.google.com/maps?saddr=" + currentLocation + "&daddr=" + place.formatted_address + "' target='_blank'>Directions</a></div><div>");
            _self.infoWindow.open(_self.map, this);
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
    stylizeInfoWindow: function() {
        google.maps.event.addListener(this.infoWindow, 'domready', function() {
            var iwOuter = jQuery('.gm-style-iw');
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
                if (!place.geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }
console.log(place);
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
    }
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