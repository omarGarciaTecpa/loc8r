var mongoose = require('mongoose');
var Loc = mongoose.model('Location');



var theEarth = (function(){
    var earthRadius = 6371; // km, miles is 3959.  define fixed value for radius of Earth
    var getDistanceFromRads = function(rads) { //Create function to convert radians to distance
        return parseFloat(rads * earthRadius);
    };
    var getRadsFromDistance = function(distance) { //Create function to convert distance to radians
        return parseFloat(distance / earthRadius);
    };
    return {
        getDistanceFromRads : getDistanceFromRads,
        getRadsFromDistance : getRadsFromDistance
    };
})();

var splitAndTrim = function(completeString){
    var facilities = [];

    if(completeString.length > 0){
        var facilitiesRaw = completeString.split(",");

        if(facilitiesRaw.length > 0){
            facilities = facilitiesRaw.map(function(item){
                return item.trim();
            });
        }
    }

    return facilities
};



/**@param res request data
 * @param status status code
 * @param content Content to be added to the request*/
var sendJsonResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};



/**@param req request data
 * @param res response data*/
/* GET list of locations */
module.exports.locationsListByDistance = function(req, res) {
    var lng = parseFloat(req.query.lng);
    var lat = parseFloat(req.query.lat);
    var maxDistance = parseFloat(req.query.maxDistance);
    var point = {
        type: "Point",
        coordinates: [lng, lat]
    };

    var geoOptions = {
        spherical: true,
        maxDistance: theEarth.getRadsFromDistance(maxDistance),
        num: 10
    };

    if ((!lng && lng!=0) || (!lat && lat!=0) || !maxDistance) {
        console.log('locationsListByDistance missing params');
        sendJsonResponse(res, 404, {"message": "lng, lat and maxDistance query parameters are all required"});
        return;
    }

    Loc.geoNear(point, geoOptions, function(err, results, stats) {
        var locations = [];
        if (err) {
            console.log('geoNear error:', err);
            sendJsonResponse(res, 404, err);
        } else {
            results.forEach(function(doc) {
                locations.push({
                    distance: theEarth.getDistanceFromRads(doc.dis),
                    name: doc.obj.name,
                    address: doc.obj.address,
                    rating: doc.obj.rating,
                    facilities: doc.obj.facilities,
                    _id: doc.obj._id
                });
            });

            sendJsonResponse(res, 200, locations);
        }
    });
};


/**@param req request data
 * @param res response data*/
module.exports.locationsCreate = function(req, res) {
    var facilities = splitAndTrim(req.body.facilities);
    Loc.create({
        name: req.body.name,
        address: req.body.address,
        facilities: facilities,
        coords: [parseFloat(req.body.lng), parseFloat(req.body.lat)],
        openingTimes: [{
            days: req.body.days1,
            opening: req.body.opening1,
            closing: req.body.closing1,
            closed: req.body.closed1
        }, {
            days: req.body.days2,
            opening: req.body.opening2,
            closing: req.body.closing2,
            closed: req.body.closed2
        }]
    }, function(err, location) {
        if (err) {
            sendJsonResponse(res, 400, err);
        } else {
            sendJsonResponse(res, 201, location);
        }
    });
};



/**@param req request data
 * @param res response data*/
module.exports.locationsReadOne = function(req, res){
    if (req.params && req.params.locationid) { //check if the location ID exists in the request params
        Loc
            .findById(req.params.locationid) //Set the query to be used
            .exec(function(err, location) {
                //Execute the query and capture the possible error and the possible found object
                // use a callback so that the thread is not stopped in anything wrong happens
                if (!location){ //Check it there is no location
                    sendJsonResponse(res, 404, {"message": "locationid not found"});
                    return;
                } else if (err) { //check if there was an error
                    sendJsonResponse(res, 404, err);
                    return;
                }
                //The case when everything goes according to plan
                sendJsonResponse(res, 200, location);
            });
    } else {
        sendJsonResponse(res, 404, {"message": "No locationid in request"});
    }
};



/**@param req request data
 * @param res response data*/
module.exports.locationsUpdateOne = function(req, res) {
    if (!req.params.locationid) {
        sendJsonResponse(res, 404, { "message": "Not found, locationid is required"  });
        return;
    }
    Loc
        .findById(req.params.locationid)
        .select('-reviews -rating')
        .exec(
            function(err, location) {
                if (!location) {
                    sendJsonResponse(res, 404, {  "message": "locationid not found"  });
                    return;
                } else if (err) {
                    sendJsonResponse(res, 400, err);
                    return;
                }
                location.name = req.body.name;
                location.address = req.body.address;
                location.facilities = req.body.facilities.split(",");
                location.coords = [parseFloat(req.body.lng),  parseFloat(req.body.lat)];
                location.openingTimes = [{
                    days:       req.body.days1,
                    opening:    req.body.opening1,
                    closing:    req.body.closing1,
                    closed:     req.body.closed1
                }, {
                    days:       req.body.days2,
                    opening:    req.body.opening2,
                    closing:    req.body.closing2,
                    closed:     req.body.closed2
                }];
                location.save(function(err, location) {
                    if (err) {  sendJsonResponse(res, 404, err);
                    } else {  sendJsonResponse(res, 200, location);  }
                });
            }
        );
};



/**@param req request data
 * @param res response data*/
module.exports.locationsDeleteOne = function(req, res) {
    var locationid = req.params.locationid;
    if (locationid) {
        Loc
            .findByIdAndRemove(locationid)  //Setup the query find and Delete
            .exec( //Execute the query
                function(err, location) {
                    if (err) {
                        sendJsonResponse(res, 404, err);
                        return;
                    }
                    sendJsonResponse(res, 204, null);
                }
            );
    } else {
        sendJsonResponse(res, 404, {"message": "No locationid"});
    }
};