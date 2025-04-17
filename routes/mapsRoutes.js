const router = require("express").Router();
const mapsController = require("../controllers/mapsController");

router.post("/directions", mapsController.getDirections); // Add the new route here

router.post("/getPolyline", mapsController.getPolyline);

router.post("/search-places", mapsController.searchPlaces);

router.post("/get-place-detail", mapsController.getPlaceDetail);

router.post("/reverse-geocode", mapsController.reverseGeocode);