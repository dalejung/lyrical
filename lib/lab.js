var _ = require('underscore');
var Layer = require('./layer.js');
var Figure = require('./figure.js');
var ipy = require('ipy_node');

function to_lyrical_layers(layers) {

  var lyrical_layers = [];
  _.each(layers, function(layer) {
      var name = layer.name;
      var data = layer.data;
      var geoms = layer.geoms;
      var ilayer = new Layer()
      ilayer.data(data);
      var geom = geoms[0];
      if (geom.type == 'candlestick') {
          var igeom = Candlestick();
      }
      if (geom.type == 'marker') {
        var igeom = Marker().type('circle');
        if (geom['color']) {
            igeom.color(geom.color);
        }
        if (geom['markersize']) {
            var size = geom.markersize * 6;
            igeom.size(size);
        } else {
            var size = 8 * 6;
            igeom.size(size);
        }
      }

      if (geom.type == 'line') {
        var igeom = Line();
        if (geom['color']) {
            igeom.color(geom.color);
        }
      }

      if (igeom) {
          ilayer.geom(igeom)
          lyrical_layers.push({'name':name, 'layer':ilayer});
      }
  });
  return lyrical_layers;
}

function station_fig(station, svg) {
  /*
   * Convert a ts-charting station object to a Figure
   */
  var fig = Figure();

  fig
    .index(station.index);

  // if we're not passed an svg element, assume that we're giving some sort
  // of html dom container and create an svg within
  if (svg.node().namespaceURI != "http://www.w3.org/2000/svg") {
    svg = svg.append('svg');
  }
  fig(svg);

  var lyrical_layers = to_lyrical_layers(station.layers);

  _.each(lyrical_layers, function(layer) {
      name = layer.name
      layer = layer.layer
      fig.layer(layer, name);
  });

  // added a title
  fig.title(station.name);

  return fig;
}

function grab_body(func) {
    var entire = func.toString(); // this part may fail!
    var body = entire.substring(entire.indexOf("{") + 1, entire.lastIndexOf("}"));
    return body;
}

function kernel_execute(base_url, path, name, main_func) {
  /*
   * Call a main_func in the global window scope after grabbing
   * a python object
   */
  var bridge = new ipy.Bridge(base_url, "kernels");
  bridge.start_kernel({path:path, name:name}).then(function(kernel) {
    window.kernel = kernel;
    return kernel.execute('to_json("lab")');
  }).then(function(out) { 
      // Execute the main function within the global window 
      // so we have access to it.
      if (out['msg_type'] == 'pyerr') {
          console.log(out['content']);
      }
      window.out = out;
      setTimeout(function() {eval.call(window, grab_body(main_func)) }, 0)
  });
}

module.exports.to_lyrical_layers = to_lyrical_layers;
module.exports.station_fig = station_fig;
module.exports.kernel_execute = kernel_execute;
module.exports.grab_body = grab_body;
