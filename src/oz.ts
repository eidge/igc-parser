import * as turf from "@turf/turf";
import * as cheapRuler from "cheap-ruler";

import Point from "./point";

export interface ObservationZone {
  center: Point;

  checkEnter(c1: Point, c2: Point): GeoJSON.Feature<GeoJSON.Point> | undefined;
}

export class Cylinder implements ObservationZone {
  center: Point;
  radius: number;

  private readonly _ruler: cheapRuler.CheapRuler;

  constructor(center: Point, radius: number) {
    this.center = center;
    this.radius = radius;
    this._ruler = cheapRuler(center[1]);
  }

  checkEnter(c1: Point, c2: Point): GeoJSON.Feature<GeoJSON.Point> | undefined {
    let intersection = turf.lineIntersect(turf.circle(this.center, this.radius / 1000), turf.lineString([c1, c2]));
    if (intersection.features.length === 0)
      return;

    if (this.isInside(c2))
      return intersection.features[0];
  }

  isInside(coordinate: Point) {
    let distance = this._ruler.distance(coordinate, this.center);
    return distance <= this.radius / 1000;
  }
}

export class Line implements ObservationZone {
  readonly center: Point;
  readonly length: number;
  readonly direction: number; // direction in which the line is triggering transitions
  readonly coordinates: cheapRuler.Line;

  private readonly _ruler: cheapRuler.CheapRuler;

  constructor(center: Point, length: number, direction: number) {
    this.center = center;
    this.length = length;
    this.direction = direction;

    this._ruler = cheapRuler(center[1]);

    let p1 = this._ruler.destination(this.center, this.length / 2000, this.direction + 90);
    let p2 = this._ruler.destination(this.center, this.length / 2000, this.direction - 90);

    this.coordinates = [p1, p2];
  }

  checkEnter(c1: Point, c2: Point): GeoJSON.Feature<GeoJSON.Point> | undefined {
    let intersection = turf.lineIntersect(turf.lineString(this.coordinates), turf.lineString([c1, c2]));
    if (intersection.features.length === 0)
      return;

    let bearing = this._ruler.bearing(c1, c2);
    let bearingDiff = turf.bearingToAngle(this.direction - bearing);
    if (bearingDiff > 90 && bearingDiff < 270)
      return;

    return intersection.features[0];
  }
}
