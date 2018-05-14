function WayPoint(map) {
    this.map = map
}
WayPoint.prototype = {
    constructor: WayPoint,
    markerArray: [],
    // Instantiate a directions service.
    directionsService: new google.maps.DirectionsService,
    // Create a renderer for directions
    directionsDisplay: [],
    map: null,
    setMap: function(map) {
        this.map = map;
    },
    getMap: function() {
        return this.map;
    },
    initialize: function() {
        if (this.markerArray.length == 0) {
            console.log("No directions!");
            return false;
        }
        this.directionsDisplay = new google.maps.DirectionsRenderer({ //bind it to the map.
            map: this.map,
            suppressMarkers: true
        });
        var ako = this;
        // This event listener calls setOrigin() when the map is clicked.
        this.waypoint_listener = google.maps.event.addListener(this.map, 'click', function(event){
            ako.setOrigin(event.latLng, ako.map);
            ako.calculateAndDisplayRoute();
        });
    },
    dropped: function(event) {
        this.setOrigin(event.latLng, this.map);
        this.calculateAndDisplayRoute();
    },
    destroy: function() {
        google.maps.event.removeListener(this.waypoint_listener);
        this.directionsDisplay.setMap(null);
        this.markerArray[1].setMap(null);
    },
    setDestination: function(marker) {
        //add the first marker
        this.markerArray[0] = marker;
        // this.markerArray[0] = new MarkerWithLabel({
        //     position: position,
        //     map: this.map,
        //     animation: google.maps.Animation.DROP, //just for fun
        //     labelContent: "",
        //     labelClass: "marker-label"
        // });
    },
    setOrigin: function(location) {
        if (this.markerArray.length >= 2) {
            this.markerArray[1].setMap(null);
        }
        this.markerArray[1] = new MarkerWithLabel({
            position: location,
            map: this.map,
            animation: google.maps.Animation.DROP, //just for fun
            labelContent: "",
            labelClass: "marker-label"
        });
    },
    calculateAndDisplayRoute: function() {
        // Retrieve the start and end locations and create a DirectionsRequest using
        // WALKING directions.
        var ako = this;
        ako.directionsService.route({
            origin: ako.markerArray[0].getPosition(),
            destination: ako.markerArray[ako.markerArray.length - 1].getPosition(),
            travelMode: google.maps.TravelMode.WALKING
        }, function(response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                ako.directionsDisplay.setDirections(response);
                route = ako.directionsDisplay.getDirections().routes[0];
                ako.markerArray[1].set('labelContent', route.legs[0].distance.value / 1000)
            } else {
                window.alert('Directions request failed due to ' + status);
            }
        });
    },
}