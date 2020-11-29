/**
 * @module ol/format/GeoJSON
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import Feature from '../Feature.js';
import GeometryCollection from '../geom/GeometryCollection.js';
import GeometryType from '../geom/GeometryType.js';
import JSONFeature from './JSONFeature.js';
import LineString from '../geom/LineString.js';
import MultiLineString from '../geom/MultiLineString.js';
import MultiPoint from '../geom/MultiPoint.js';
import MultiPolygon from '../geom/MultiPolygon.js';
import Point from '../geom/Point.js';
import Polygon from '../geom/Polygon.js';
import { assert } from '../asserts.js';
import { assign, isEmpty } from '../obj.js';
import { get as getProjection } from '../proj.js';
import { transformGeometryWithOptions } from './Feature.js';
/**
 * @typedef {import("geojson").GeoJSON} GeoJSONObject
 * @typedef {import("geojson").Feature} GeoJSONFeature
 * @typedef {import("geojson").FeatureCollection} GeoJSONFeatureCollection
 * @typedef {import("geojson").Geometry} GeoJSONGeometry
 * @typedef {import("geojson").Point} GeoJSONPoint
 * @typedef {import("geojson").LineString} GeoJSONLineString
 * @typedef {import("geojson").Polygon} GeoJSONPolygon
 * @typedef {import("geojson").MultiPoint} GeoJSONMultiPoint
 * @typedef {import("geojson").MultiLineString} GeoJSONMultiLineString
 * @typedef {import("geojson").MultiPolygon} GeoJSONMultiPolygon
 * @typedef {import("geojson").GeometryCollection} GeoJSONGeometryCollection
 */
/**
 * @typedef {Object} Options
 * @property {import("../proj.js").ProjectionLike} [dataProjection='EPSG:4326'] Default data projection.
 * @property {import("../proj.js").ProjectionLike} [featureProjection] Projection for features read or
 * written by the format.  Options passed to read or write methods will take precedence.
 * @property {string} [geometryName] Geometry name to use when creating features.
 * @property {boolean} [extractGeometryName=false] Certain GeoJSON providers include
 * the geometry_name field in the feature GeoJSON. If set to `true` the GeoJSON reader
 * will look for that field to set the geometry name. If both this field is set to `true`
 * and a `geometryName` is provided, the `geometryName` will take precedence.
 */
/**
 * @classdesc
 * Feature format for reading and writing data in the GeoJSON format.
 *
 * @api
 */
var GeoJSON = /** @class */ (function (_super) {
    __extends(GeoJSON, _super);
    /**
     * @param {Options=} opt_options Options.
     */
    function GeoJSON(opt_options) {
        var _this = this;
        var options = opt_options ? opt_options : {};
        _this = _super.call(this) || this;
        /**
         * @type {import("../proj/Projection.js").default}
         */
        _this.dataProjection = getProjection(options.dataProjection ? options.dataProjection : 'EPSG:4326');
        if (options.featureProjection) {
            _this.defaultFeatureProjection = getProjection(options.featureProjection);
        }
        /**
         * Name of the geometry attribute for features.
         * @type {string|undefined}
         * @private
         */
        _this.geometryName_ = options.geometryName;
        /**
         * Look for the geometry name in the feature GeoJSON
         * @type {boolean|undefined}
         * @private
         */
        _this.extractGeometryName_ = options.extractGeometryName;
        return _this;
    }
    /**
     * @param {Object} object Object.
     * @param {import("./Feature.js").ReadOptions=} opt_options Read options.
     * @protected
     * @return {import("../Feature.js").default} Feature.
     */
    GeoJSON.prototype.readFeatureFromObject = function (object, opt_options) {
        /**
         * @type {GeoJSONFeature}
         */
        var geoJSONFeature = null;
        if (object['type'] === 'Feature') {
            geoJSONFeature = /** @type {GeoJSONFeature} */ (object);
        }
        else {
            geoJSONFeature = {
                'type': 'Feature',
                'geometry': /** @type {GeoJSONGeometry} */ (object),
                'properties': null,
            };
        }
        var geometry = readGeometry(geoJSONFeature['geometry'], opt_options);
        var feature = new Feature();
        if (this.geometryName_) {
            feature.setGeometryName(this.geometryName_);
        }
        else if (this.extractGeometryName_ &&
            'geometry_name' in geoJSONFeature !== undefined) {
            feature.setGeometryName(geoJSONFeature['geometry_name']);
        }
        feature.setGeometry(geometry);
        if ('id' in geoJSONFeature) {
            feature.setId(geoJSONFeature['id']);
        }
        if (geoJSONFeature['properties']) {
            feature.setProperties(geoJSONFeature['properties'], true);
        }
        return feature;
    };
    /**
     * @param {Object} object Object.
     * @param {import("./Feature.js").ReadOptions=} opt_options Read options.
     * @protected
     * @return {Array<Feature>} Features.
     */
    GeoJSON.prototype.readFeaturesFromObject = function (object, opt_options) {
        var geoJSONObject = /** @type {GeoJSONObject} */ (object);
        /** @type {Array<import("../Feature.js").default>} */
        var features = null;
        if (geoJSONObject['type'] === 'FeatureCollection') {
            var geoJSONFeatureCollection = /** @type {GeoJSONFeatureCollection} */ (object);
            features = [];
            var geoJSONFeatures = geoJSONFeatureCollection['features'];
            for (var i = 0, ii = geoJSONFeatures.length; i < ii; ++i) {
                features.push(this.readFeatureFromObject(geoJSONFeatures[i], opt_options));
            }
        }
        else {
            features = [this.readFeatureFromObject(object, opt_options)];
        }
        return features;
    };
    /**
     * @param {GeoJSONGeometry} object Object.
     * @param {import("./Feature.js").ReadOptions=} opt_options Read options.
     * @protected
     * @return {import("../geom/Geometry.js").default} Geometry.
     */
    GeoJSON.prototype.readGeometryFromObject = function (object, opt_options) {
        return readGeometry(object, opt_options);
    };
    /**
     * @param {Object} object Object.
     * @protected
     * @return {import("../proj/Projection.js").default} Projection.
     */
    GeoJSON.prototype.readProjectionFromObject = function (object) {
        var crs = object['crs'];
        var projection;
        if (crs) {
            if (crs['type'] == 'name') {
                projection = getProjection(crs['properties']['name']);
            }
            else if (crs['type'] === 'EPSG') {
                projection = getProjection('EPSG:' + crs['properties']['code']);
            }
            else {
                assert(false, 36); // Unknown SRS type
            }
        }
        else {
            projection = this.dataProjection;
        }
        return /** @type {import("../proj/Projection.js").default} */ (projection);
    };
    /**
     * Encode a feature as a GeoJSON Feature object.
     *
     * @param {import("../Feature.js").default} feature Feature.
     * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
     * @return {GeoJSONFeature} Object.
     * @api
     */
    GeoJSON.prototype.writeFeatureObject = function (feature, opt_options) {
        opt_options = this.adaptOptions(opt_options);
        /** @type {GeoJSONFeature} */
        var object = {
            'type': 'Feature',
            geometry: null,
            properties: null,
        };
        var id = feature.getId();
        if (id !== undefined) {
            object.id = id;
        }
        if (!feature.hasProperties()) {
            return object;
        }
        var properties = feature.getProperties();
        var geometry = feature.getGeometry();
        if (geometry) {
            object.geometry = writeGeometry(geometry, opt_options);
            delete properties[feature.getGeometryName()];
        }
        if (!isEmpty(properties)) {
            object.properties = properties;
        }
        return object;
    };
    /**
     * Encode an array of features as a GeoJSON object.
     *
     * @param {Array<import("../Feature.js").default>} features Features.
     * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
     * @return {GeoJSONFeatureCollection} GeoJSON Object.
     * @api
     */
    GeoJSON.prototype.writeFeaturesObject = function (features, opt_options) {
        opt_options = this.adaptOptions(opt_options);
        var objects = [];
        for (var i = 0, ii = features.length; i < ii; ++i) {
            objects.push(this.writeFeatureObject(features[i], opt_options));
        }
        return {
            type: 'FeatureCollection',
            features: objects,
        };
    };
    /**
     * Encode a geometry as a GeoJSON object.
     *
     * @param {import("../geom/Geometry.js").default} geometry Geometry.
     * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
     * @return {GeoJSONGeometry|GeoJSONGeometryCollection} Object.
     * @api
     */
    GeoJSON.prototype.writeGeometryObject = function (geometry, opt_options) {
        return writeGeometry(geometry, this.adaptOptions(opt_options));
    };
    return GeoJSON;
}(JSONFeature));
/**
 * @param {GeoJSONGeometry|GeoJSONGeometryCollection} object Object.
 * @param {import("./Feature.js").ReadOptions=} opt_options Read options.
 * @return {import("../geom/Geometry.js").default} Geometry.
 */
function readGeometry(object, opt_options) {
    if (!object) {
        return null;
    }
    /**
     * @type {import("../geom/Geometry.js").default}
     */
    var geometry;
    switch (object['type']) {
        case GeometryType.POINT: {
            geometry = readPointGeometry(/** @type {GeoJSONPoint} */ (object));
            break;
        }
        case GeometryType.LINE_STRING: {
            geometry = readLineStringGeometry(
            /** @type {GeoJSONLineString} */ (object));
            break;
        }
        case GeometryType.POLYGON: {
            geometry = readPolygonGeometry(/** @type {GeoJSONPolygon} */ (object));
            break;
        }
        case GeometryType.MULTI_POINT: {
            geometry = readMultiPointGeometry(
            /** @type {GeoJSONMultiPoint} */ (object));
            break;
        }
        case GeometryType.MULTI_LINE_STRING: {
            geometry = readMultiLineStringGeometry(
            /** @type {GeoJSONMultiLineString} */ (object));
            break;
        }
        case GeometryType.MULTI_POLYGON: {
            geometry = readMultiPolygonGeometry(
            /** @type {GeoJSONMultiPolygon} */ (object));
            break;
        }
        case GeometryType.GEOMETRY_COLLECTION: {
            geometry = readGeometryCollectionGeometry(
            /** @type {GeoJSONGeometryCollection} */ (object));
            break;
        }
        default: {
            throw new Error('Unsupported GeoJSON type: ' + object.type);
        }
    }
    return transformGeometryWithOptions(geometry, false, opt_options);
}
/**
 * @param {GeoJSONGeometryCollection} object Object.
 * @param {import("./Feature.js").ReadOptions=} opt_options Read options.
 * @return {GeometryCollection} Geometry collection.
 */
function readGeometryCollectionGeometry(object, opt_options) {
    var geometries = object['geometries'].map(
    /**
     * @param {GeoJSONGeometry} geometry Geometry.
     * @return {import("../geom/Geometry.js").default} geometry Geometry.
     */
    function (geometry) {
        return readGeometry(geometry, opt_options);
    });
    return new GeometryCollection(geometries);
}
/**
 * @param {GeoJSONPoint} object Object.
 * @return {Point} Point.
 */
function readPointGeometry(object) {
    return new Point(object['coordinates']);
}
/**
 * @param {GeoJSONLineString} object Object.
 * @return {LineString} LineString.
 */
function readLineStringGeometry(object) {
    return new LineString(object['coordinates']);
}
/**
 * @param {GeoJSONMultiLineString} object Object.
 * @return {MultiLineString} MultiLineString.
 */
function readMultiLineStringGeometry(object) {
    return new MultiLineString(object['coordinates']);
}
/**
 * @param {GeoJSONMultiPoint} object Object.
 * @return {MultiPoint} MultiPoint.
 */
function readMultiPointGeometry(object) {
    return new MultiPoint(object['coordinates']);
}
/**
 * @param {GeoJSONMultiPolygon} object Object.
 * @return {MultiPolygon} MultiPolygon.
 */
function readMultiPolygonGeometry(object) {
    return new MultiPolygon(object['coordinates']);
}
/**
 * @param {GeoJSONPolygon} object Object.
 * @return {Polygon} Polygon.
 */
function readPolygonGeometry(object) {
    return new Polygon(object['coordinates']);
}
/**
 * @param {import("../geom/Geometry.js").default} geometry Geometry.
 * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
 * @return {GeoJSONGeometry} GeoJSON geometry.
 */
function writeGeometry(geometry, opt_options) {
    geometry = transformGeometryWithOptions(geometry, true, opt_options);
    var type = geometry.getType();
    /** @type {GeoJSONGeometry} */
    var geoJSON;
    switch (type) {
        case GeometryType.POINT: {
            geoJSON = writePointGeometry(
            /** @type {Point} */ (geometry), opt_options);
            break;
        }
        case GeometryType.LINE_STRING: {
            geoJSON = writeLineStringGeometry(
            /** @type {LineString} */ (geometry), opt_options);
            break;
        }
        case GeometryType.POLYGON: {
            geoJSON = writePolygonGeometry(
            /** @type {Polygon} */ (geometry), opt_options);
            break;
        }
        case GeometryType.MULTI_POINT: {
            geoJSON = writeMultiPointGeometry(
            /** @type {MultiPoint} */ (geometry), opt_options);
            break;
        }
        case GeometryType.MULTI_LINE_STRING: {
            geoJSON = writeMultiLineStringGeometry(
            /** @type {MultiLineString} */ (geometry), opt_options);
            break;
        }
        case GeometryType.MULTI_POLYGON: {
            geoJSON = writeMultiPolygonGeometry(
            /** @type {MultiPolygon} */ (geometry), opt_options);
            break;
        }
        case GeometryType.GEOMETRY_COLLECTION: {
            geoJSON = writeGeometryCollectionGeometry(
            /** @type {GeometryCollection} */ (geometry), opt_options);
            break;
        }
        case GeometryType.CIRCLE: {
            geoJSON = {
                type: 'GeometryCollection',
                geometries: [],
            };
            break;
        }
        default: {
            throw new Error('Unsupported geometry type: ' + type);
        }
    }
    return geoJSON;
}
/**
 * @param {GeometryCollection} geometry Geometry.
 * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
 * @return {GeoJSONGeometryCollection} GeoJSON geometry collection.
 */
function writeGeometryCollectionGeometry(geometry, opt_options) {
    var geometries = geometry.getGeometriesArray().map(function (geometry) {
        var options = assign({}, opt_options);
        delete options.featureProjection;
        return writeGeometry(geometry, options);
    });
    return {
        type: 'GeometryCollection',
        geometries: geometries,
    };
}
/**
 * @param {LineString} geometry Geometry.
 * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
 * @return {GeoJSONGeometry} GeoJSON geometry.
 */
function writeLineStringGeometry(geometry, opt_options) {
    return {
        type: 'LineString',
        coordinates: geometry.getCoordinates(),
    };
}
/**
 * @param {MultiLineString} geometry Geometry.
 * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
 * @return {GeoJSONGeometry} GeoJSON geometry.
 */
function writeMultiLineStringGeometry(geometry, opt_options) {
    return {
        type: 'MultiLineString',
        coordinates: geometry.getCoordinates(),
    };
}
/**
 * @param {MultiPoint} geometry Geometry.
 * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
 * @return {GeoJSONGeometry} GeoJSON geometry.
 */
function writeMultiPointGeometry(geometry, opt_options) {
    return {
        type: 'MultiPoint',
        coordinates: geometry.getCoordinates(),
    };
}
/**
 * @param {MultiPolygon} geometry Geometry.
 * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
 * @return {GeoJSONGeometry} GeoJSON geometry.
 */
function writeMultiPolygonGeometry(geometry, opt_options) {
    var right;
    if (opt_options) {
        right = opt_options.rightHanded;
    }
    return {
        type: 'MultiPolygon',
        coordinates: geometry.getCoordinates(right),
    };
}
/**
 * @param {Point} geometry Geometry.
 * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
 * @return {GeoJSONGeometry} GeoJSON geometry.
 */
function writePointGeometry(geometry, opt_options) {
    return {
        type: 'Point',
        coordinates: geometry.getCoordinates(),
    };
}
/**
 * @param {Polygon} geometry Geometry.
 * @param {import("./Feature.js").WriteOptions=} opt_options Write options.
 * @return {GeoJSONGeometry} GeoJSON geometry.
 */
function writePolygonGeometry(geometry, opt_options) {
    var right;
    if (opt_options) {
        right = opt_options.rightHanded;
    }
    return {
        type: 'Polygon',
        coordinates: geometry.getCoordinates(right),
    };
}
export default GeoJSON;
//# sourceMappingURL=GeoJSON.js.map