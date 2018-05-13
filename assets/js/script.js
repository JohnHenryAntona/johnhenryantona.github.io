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
            lat: 10.3157,
            lng: 123.8854
        },
        zoom: 5
    },
    iconInfo: null,
    specialties: ['bar','café','buffet','lechon','barbecue','lantaw','seafood','japanese','italian','mexican'],
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
    filterCount: 0,
    currentFilters: [],
    filterStatus: 0,
    init: function() {
        // Create the search box and link it to the UI element.
        var input = document.getElementById('search-input');
        this.searchBox = new google.maps.places.SearchBox(input);
        // Bias the SearchBox results towards current map's viewport.
        this.listenBoundsChange();
        
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        this.listenPlacesChange();
    },
    setMarkerFilter: function(place, status) {
        // console.log(place, 'henry');
        // var _self = MapRenderer;
        // this.specialties.forEach(function(index){
        //     marker.filter = _self.place.indexOf(camelize(index)) > -1 ? index : '';
        // });
        // this.place = null;
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
            if ( _self.place.title.indexOf(camelize(index)) > -1 ) {
                marker.filter = index;
                if ( _self.place.title.indexOf('Yakiniku') > -1 && index == 'japanese') {
                    marker.filter = index;
                }
            }
        });
        _self.place = null;

        this.markerGroups.restaurants.push(marker);

        // var bounds = new google.maps.LatLngBounds();
        this.bounds.extend(marker.position);

        if (place.geometry.viewport) {
            // Only geocodes have viewport.
            this.bounds.union(place.geometry.viewport);
        } else {
            this.bounds.extend(place.geometry.location);
        }

        // Add custom css on info window and render contents
        this.stylizeInfoWindow();

        var currentLocation = 'current+location';
        google.maps.event.addListener(marker, 'click', function() {
            _self.map.setZoom(12);
            // _self.map.setCenter(marker.getPosition());
            _self.infoWindow.setContent("<div id='iw-container'><div class='iw-title'><b>" + place.name + "</b></div><div class='iw-content'><span>" + place.formatted_address + "</span></br><a href='https://maps.google.com/maps?saddr=" + currentLocation + "&daddr=" + place.formatted_address + "' target='_blank'>Directions</a></div><div>");
            _self.infoWindow.open(_self.map, this);
        });

        _self.specialties.forEach(function(index){
            // if ( index ) {}
            google.maps.event.addDomListener(document.getElementById(index),
                'click', function() {
                    _self.filterStatus = 0;
                    if ( !_self.filters[index] ) {
                        // _self.filterCount++;
                      _self.filters[index] = true;
                      _self.currentFilters.push(index);
                    } else {
                        // _self.filterCount--;
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
                border: '7px solid #D52B1E',
                width: '26px',
                height: '26px',
                'border-radius': '50%',
                'box-shadow': '0 0 5px #D52B1E'
            });
            iwCloseBtn.mouseout(function(){
                jQuery(this).css({opacity: '1'});
            });
        });
    },
    markerToggleSpeacialtyClasses: function(name) {
        var specialties = place.types;
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
            _self.service = new google.maps.places.PlacesService(_self.map);
            places.forEach(function(place) {
                var details = _self.service.getDetails({
                    placeId: place.place_id
                }, function(place, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        _self.place = place;
                        // _self.setMarkerFilter(place, status);
                    }
                });
                if (!place.geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }
                // console.log(place);

                // Create markers and plot to map
                _self.createMarker(place);
            });
            _self.map.fitBounds(_self.bounds);
        });
    },
    toggleMarkerGroup: function(filter) {
        var _self = MapRenderer;
        // for (var i = 0; i < this.markerGroups.restaurants.length; i++) {
        if ( this.currentFilters.length > 0 ) {
            this.markerGroups.restaurants.forEach(function(i){
                var marker = i;
                if ( _self.currentFilters.indexOf(i.filter) > -1 ) {
                    marker.setVisible(true);
                } else {
                    marker.setVisible(false);
                }

            });
            this.filterStatus = 1;
            // console.log(marker.title, filter, marker.title.indexOf(camelize(filter)) );
            // // if ( this.filterCount > 0 ) {
            //     if (marker.title.indexOf(camelize(filter)) > -1) {
            //         marker.setVisible(true);
            //     } else {
            //         // if (this.filters[marker.filter] == true) {
            //         //     marker.setVisible(true);
            //         // } else {
            //             marker.setVisible(false);
            //         // }
            //     }
            // } else {
            //     marker.setVisible(true);
            // }
        }
        // }
    }
}

function camelize(str) {
    return str.toLowerCase().replace(/(?:(^.)|(\s+.))/g, function(match) {
        return match.charAt(match.length-1).toUpperCase();
    });
}

function initMap() {
    MapRenderer.map = new google.maps.Map(document.getElementById('map'), MapRenderer.mapOptions);
    MapRenderer.infoWindow = new google.maps.InfoWindow();
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

function countFilters() {
    result = MapRenderer.filters;

    var valuesArray = Object.values(result);

    if (valuesArray instanceof Array) {
        valuesArray.forEach(function (v, i) {
            if ( v == true ) {
                MapRenderer.filterCount++;
            }
        });
    }
    var count = MapRenderer.filterCount;
    return count;

}
