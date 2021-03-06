var d3 = require('d3');
var _ = require('underscore');

var axis = require('./context.js');
var callable = require('./callable.js');
var View = require('lyrical/lib/view.js');
var DatetimeIndex = require('./date/dateindex.js').DatetimeIndex;

var lyrical_id = 0;

function Figure() {
  this.x = axis();
  this.y = axis();
  this._width = null;
  this._height = null; 
  this._padding = {};
  this._margin = {};
  this._index = null;
  this.layers = [];
  this.selection = null;
  this.canvas = null;
  this._title = null;
  this.dispatch = d3.dispatch('mouseover', 'width', 'height');

  // default margin
  this.margin(0);
  // default padding 5% of domain
  this.padding(.05);

  var self = this;
  this.x.on('change.figure', function(domain) {
    self.xchange(domain);
  }); 

  this.__call__ = function(selection) {
    this.selection = selection;

    var margin = this.margin();
    var width = this.width();
    var height = this.height();
    selection.attr('width', width+margin.left+margin.right);
    selection.attr('height', height+margin.top+margin.bottom);
    var canvas = selection.selectAll('g.canvas').data([1]);

    canvas.enter().append('svg:g')
      .attr('class', 'canvas');
    canvas
      .attr("transform", "translate("+margin.left+", "+margin.top+")");

    // add title
    var tdata = [];
    if(this.title()) {
      tdata = [self.title()];
    }
    var title = canvas.selectAll('text.title').data(tdata);
    title.enter().append('svg:text')
      .attr('class', 'title')
      .attr('dx', 8)
      .attr('dy', 20)
      .text(function(d){return d});

    title.exit().remove();

    this.canvas = canvas;
  }

  this.xchange = function(domain) {
    this.x.domain(domain);
    var layers = this.layers;

    _.each(this.layers, function(layer) {
      layer.xview(domain);
      layer.update();
    });

    this.merge_y();
    this.redraw();
    return this;
  }

  this.merge_y = function() {
    y_domains = _.invoke(this.layers, 'yview');
    //merged y-domains
    y_min = d3.min(y_domains, function(d) { return d[0] });
    y_max = d3.max(y_domains, function(d) { return d[1] });

    var top = this.padding().top;
    var bottom = this.padding().bottom;
    var diff = y_max - y_min;

    if (top < 1) {
      top = top * diff;
    }
    if (bottom < 1) {
      bottom = bottom * diff
    }
    y_max = y_max + top;
    y_min = y_min - bottom;

    new_y = [y_min, y_max];
    this.y.domain(new_y);

    // update the layers of the merged view
    _.invoke(this.layers, 'yview', new_y);
  }

  // attempt to wait and batch multiple redraw calls into one.
  // useful for batching figure.width(width).height(height) into
  // one redraw
  var redraw_timeout;
  this.redraw = function() {
    var self = this;
    clearTimeout(redraw_timeout);
    redraw_timeout = setTimeout(function() {self._redraw()}, 50);
  };

  this._redraw = function() {
    var canvas = this.canvas;
    if (!canvas) {
      return;
    }

    // resize svg and canvas if needed
    this(this.selection);

    _.each(this.layers, function(layer) {
      layer(canvas);
    });
  }

  this.index = function(index) {
    if (!arguments.length) return this._index;
    index = DatetimeIndex(index);
    this._index = index;
    // init x-axis
    this.x.domain([0, index.values.length-1]);
    return this;
  }

  this.layer = function(layer, id, redraw) {
    if (layer.data_length() != this.index().values.length) {
      throw new Error('Layer data length mismatch fig.length:' + this.index().values.length
          + id +'.data_length():' + layer.data_length());
    }
    if (!id) {
      id = 'layer_'+lyrical_id++;
    }
    var layers = this.layers;

    // wrap any non-Views
    if (!layer.view_wrapped) {
      layer = View().layer(layer);
    }
    layer.layer_name = id;

    layers.push(layer);
    // sync to plot
    layer.xview(this.x.domain());
    layer.yview(this.y.domain());
    layer.width(this.width());
    layer.height(this.height());

    layer.xview(this.x.domain());
    layer.update();

    // redraw figure? this can be expensive if adding many layers
    redraw = 'undefined' == typeof(redraw) ? true  : redraw;
    if (redraw) {
      this.merge_y();
      this.redraw(); 
    }
  }
}

Figure.prototype.width = function(width) {
  if (!arguments.length) {
    var width = this._width;
    // default to offsetWidth
    if (!width) {
      width = this.selection[0][0].offsetWidth;
      this.x.range([0, width]);
    }
    return width;
  }
  this._width = width;
  this.x.range([0, width]); // set right away so axes have access

  _.each(this.layers, function(layer) {
    layer.width(width);
  });

  // dispatch change of width
  this.dispatch.width(width);

  this.redraw();
  return this;
}

Figure.prototype.height = function(height) {
  if (!arguments.length) {
    var height = this._height;
    // default to offsetHeight
    if (!height) {
      height = this.selection[0][0].offsetHeight;
      this.y.range([height, 0]);
    }
    return height;
  }
  this._height = height;
  this.y.range([height, 0]); // set right away so axes have access
  // propogate height to layers
  _.each(this.layers, function(layer) {
    layer.height(height);
  });

  // dispatch change of height
  this.dispatch.height(height);

  this.redraw();
  return this;
}

Figure.prototype.padding = function(padding) {
  if (!arguments.length) return this._padding;
  if (typeof(padding) == 'number') {
    padding = {'top': padding, 'left': padding, 'right': padding, 'bottom': padding};
  }
  this._padding = _.extend(this._padding, padding);
  return this;
}

Figure.prototype.margin = function(margin) {
  if (!arguments.length) return this._margin;
  if (typeof(margin) == 'number') {
    margin = {'top': margin, 'left': margin, 'right': margin, 'bottom': margin};
  }
  this._margin = _.extend(this._margin, margin);
  return this;
}

Figure.prototype.title = function(title) {
  if (!arguments.length) return this._title;
  this._title = title;
  return this;
}

Figure.prototype.on = function(type, listener) {
  this.dispatch.on(type, listener);
}

module.exports = callable(Figure);
// monkey patches
require('./axes.js');
require('./brush.js');
