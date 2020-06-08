const OGC = new $rdf.Namespace("http://www.opengis.net/ont/geosparql#");
function rdfToGeoJSON(
  store,
  source = null,
  getProps = true,
  getRDFItems = false
) {
  if (Array.isArray(store)) {
    ins = store;
    store = $rdf.graph();
    store.add(ins);
  }
  if (typeof source === "string") {
    source = $rdf.sym(source);
  }
  geoms = store.match(null, OGC("asWKT"), null, source);
  geojson = {
    type: "FeatureCollection",
    features: geoms.map(st => {
      wkt = new Wkt.Wkt();
      wkt.read(st.object.value);
      geom = wkt.toJson();
      // Assumes there is only a single feature with given geometry and wkt
      item = store.any(null, OGC("hasGeometry"), st.subject);
      var props = {};
      if (getProps) {
        props_st = store.match(item, null, null);
        props_st.forEach(prop_st => {
          // TODO: assumes encoding with uri#field
          field = prop_st.predicate.value.split("#")[1];
          if (field == "hasGeometry") return false;
          value = $rdf.Literal.toJS(prop_st.object);
          props[field] = value;
        });
      }
      if (getRDFItems) {
        props._geom = st.subject;
        props._item = item;
      }
      return {
        type: "Feature",
        properties: props,
        geometry: geom
      };
    })
  };
  return geojson;
}

function GeoJSONtoRDF(geojson, doc) {
  if (geojson.type == "Feature")
    geojson = { type: "FeatureCollection", features: [geojson] };
  if (geojson.type !== "FeatureCollection")
    throw new Error("Expected FeatureCollection");
  // TODO: crs, name
  var ins = [];
  geojson.features.forEach(feature => {
    wkt = new Wkt.Wkt();
    txt = wkt.fromJson(feature);
    let geom = $rdf.blankNode();
    let rdf_feature = $rdf.blankNode();
    ins.push(
      $rdf.st(
        geom,
        OGC("asWKT"),
        $rdf.lit(txt, OGC("wktLiteral")),
        $rdf.namedNode(doc)
      )
    );
    ins.push(
      $rdf.st(rdf_feature, OGC("hasGeometry"), geom, $rdf.namedNode(doc))
    );
    Object.keys(feature.properties).forEach(prop => {
      if (prop == "_item" || prop == "_geom") return null;
      ins.push(
        $rdf.st(
          rdf_feature,
          $rdf.sym(doc + "#" + prop),
          feature.properties[prop],
          $rdf.namedNode(doc)
        )
      );
    });
  });
  return ins;
}

/*
// https://stackoverflow.com/questions/27030/comparing-arrays-of-objects-in-javascript
objectsEqual = (o1, o2) =>
  typeof o1 === "object" && Object.keys(o1).length > 0
    ? Object.keys(o1).length === Object.keys(o2).length &&
      Object.keys(o1).every(p => objectsEqual(o1[p], o2[p]))
    : o1 === o2;

zonedoc =
  "https://josephguillaume.solid.community/public/geodata/zones_canberra.ttl";

ins = GeoJSONtoRDF(zones_geojson, zonedoc);
// TODO: Does not preserve name, crs
// order of properties may differ
zones_geojson2 = rdfToGeoJSON(ins, zonedoc);

zones_geojson.features
  .map((x, i) => objectsEqual(x, zones_geojson2.features[i]))
  .every(x => x);

// blank nodes differ
ins2 = GeoJSONtoRDF(zones_geojson2, zonedoc);
ins.forEach((x, i) => {
  if (x.subject.termType == "BlankNode") delete ins[i].subject;
});
ins2.forEach((x, i) => {
  if (x.subject.termType == "BlankNode") delete ins2[i].subject;
});
ins.forEach((x, i) => {
  if (x.object.termType == "BlankNode") delete ins[i].object;
});
ins2.forEach((x, i) => {
  if (x.object.termType == "BlankNode") delete ins2[i].object;
});
ins.map((x, i) => objectsEqual(x, ins2[i])).every(x => x);
*/

/*
fetcher.createIfNotExists($rdf.namedNode(zonedoc));
updater.update([], ins, (uri, ok, message) => {
  if (ok) {
    console.log("saved");
  } else console.error(message);
});
*/
