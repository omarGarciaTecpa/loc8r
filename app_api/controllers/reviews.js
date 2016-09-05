var mongoose = require('mongoose');
var Loc = mongoose.model('Location');


var sendJsonResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};



var updateAverageRating = function(locationid) {
    Loc
        .findById(locationid)
        .select('rating reviews')
        .exec(
            function(err, location) {
                if (!err) {doSetAverageRating(location);}
            });
};



var doSetAverageRating = function(location) {
    var i, reviewCount, ratingAverage, ratingTotal;
    if (location.reviews && location.reviews.length > 0) {
        reviewCount = location.reviews.length;
        ratingTotal = 0;
        for (i = 0; i < reviewCount; i++) {
            ratingTotal = ratingTotal + location.reviews[i].rating;
        }
        ratingAverage = parseInt(ratingTotal / reviewCount, 10);
        location.rating = ratingAverage;
        location.save(function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("Average rating updated to", ratingAverage);
            }
        });
    }
};



var doAddReview = function(req, res, location) {
    if (!location) {
        sendJsonResponse(res, 404, {"message": "locationid not found"});
    } else {
        location.reviews.push({
            author: req.body.author,
            rating: req.body.rating,
            reviewText: req.body.reviewText
        });
        location.save(function(err, location) {
            var thisReview;
            if (err) {
                sendJsonResponse(res, 400, err);
            } else {
                updateAverageRating(location._id);
                thisReview = location.reviews[location.reviews.length - 1];
                sendJsonResponse(res, 201, thisReview);
            }
        });
    }
};



module.exports.reviewsCreate = function(req, res) {
    var locationid = req.params.locationid;
    if (locationid) {
        Loc
            .findById(locationid)
            .select('reviews')
            .exec(
                function(err, location) {
                    if (err) {
                        sendJsonResponse(res, 400, err);
                    } else {
                        doAddReview(req, res, location);
                    }
                }
            );
    } else {
        sendJsonResponse(res, 404, {"message": "Not found, locationid required"});
    }
};



module.exports.reviewsReadOne = function(req, res){
    if (req.params && req.params.locationid  && req.params.reviewid) { //check if the location ID exists in the request params
        Loc
            .findById(req.params.locationid) //Set the query to be used
            //.select('name reviews') //Add Mongoose select method to model query, stating that we want to get name of location and its reviews
            .exec(function(err, location) {
                var response, review;
                //Execute the query and capture the possible error and the possible found object
                // use a callback so that the thread is not stopped in anything wrong happens
                if (!location){ //Check it there is no location
                    sendJsonResponse(res, 404, {"message": "locationid not found"});
                    return;
                } else if (err) { //check if there was an error
                    sendJsonResponse(res, 404, err);
                    return;
                }

                if (location.reviews && location.reviews.length > 0) { //Check that returned location has reviews
                    console.log(location.reviews);
                    review = location.reviews.id(req.params.reviewid); //Use Mongoose subdocument .id method as a helper for searching for matching ID
                    console.log(location.reviews.id(req.params.reviewid));
                    if (!review) { //If review isn’t found return an appropriate response
                        sendJsonResponse(res, 404, {   "message": "reviewid not found"   });
                    } else {
                        //If review is found
                        response = {
                            location : {
                                name : location.name,
                                id : req.params.locationid
                            },
                            review : review
                        };
                        sendJsonResponse(res, 200, response);
                    }
                } else {
                    sendJsonResponse(res, 404, {"message": "No reviews found"});
                }
            });
    } else {
        sendJsonResponse(res, 404, {"message": "No locationid in request"});
    }
};



module.exports.reviewsUpdateOne = function(req, res) {
    if (!req.params.locationid || !req.params.reviewid) { // Check if the params for the action are complete
        sendJsonResponse(res, 404, {"message": "Not found, locationid and reviewid are both required"});
        return;
    }
    Loc
        .findById(req.params.locationid) //setup query
        .select('reviews')
        .exec( //Execute query
            function(err, location) {
                var thisReview;

                if (!location) { //Check if location is not found
                    sendJsonResponse(res, 404, {"message": "locationid not found"});
                    return;
                } else if (err) { //Check if there was an error in the execution of the query
                    sendJsonResponse(res, 400, err);
                    return;
                }

                if (location.reviews && location.reviews.length > 0) { //check if the location has reviews
                    thisReview = location.reviews.id(req.params.reviewid);
                    if (!thisReview) {
                        sendJsonResponse(res, 404, {"message": "reviewid not found"});
                    } else {
                        thisReview.author = req.body.author;
                        thisReview.rating = req.body.rating;
                        thisReview.reviewText = req.body.reviewText;
                        location.save(function(err, location) {
                            if (err) {
                                sendJsonResponse(res, 404, err);
                            } else {
                                updateAverageRating(location._id);
                                sendJsonResponse(res, 200, thisReview);
                            }
                        });
                    }
                } else {
                    sendJsonResponse(res, 404, {  "message": "No review to update"}   );
                }
            }
        );
};



module.exports.reviewsDeleteOne = function(req, res) {
    if (!req.params.locationid || !req.params.reviewid) {
        sendJsonResponse(res, 404, {"message": "Not found, locationid and reviewid are both required"});
        return;
    }
    Loc
        .findById(req.params.locationid)
        .select('reviews')
        .exec(
            function(err, location) {
                if (!location) {sendJsonResponse(res, 404, {"message": "locationid not found"});
                    return;
                } else if (err) {
                    sendJsonResponse(res, 400, err);
                    return;
                }
                if (location.reviews && location.reviews.length > 0) {
                    if (!location.reviews.id(req.params.reviewid)) {
                        sendJsonResponse(res, 404, {"message": "reviewid not found"});
                    } else {
                        location.reviews.id(req.params.reviewid).remove();
                        location.save(function(err) {
                            if (err) {
                                sendJsonResponse(res, 404, err);
                            } else {
                                updateAverageRating(location._id);
                                sendJsonResponse(res, 204, null);
                            }
                        });
                    }
                } else {
                    sendJsonResponse(res, 404, {"message": "No review to delete"});
                }
            }
        );
};