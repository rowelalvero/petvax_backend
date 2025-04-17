const express = require('express');
const mapsController = require("../controllers/mapsController");

const router = express.Router();

router.post("/directions", mapsController.getDirections); // Add the new route here

router.post("/getPolyline", mapsController.getPolyline);

router.post("/search-places", mapsController.searchPlaces);

router.post("/get-place-detail", mapsController.getPlaceDetail);

router.post("/reverse-geocode", mapsController.reverseGeocode);

module.exports = router;