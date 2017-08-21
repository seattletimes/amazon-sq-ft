// require("./lib/social");
// require("./lib/ads");
// var track = require("./lib/tracking");

require("component-responsive-frame/child");

var $ = require("./lib/qsa");
var colors = require("./lib/colors");
var delegate = require("./lib/delegate");

var lookup = {};
window.offices.forEach(o => lookup[o.employer] = o.ft);

//build a binary tree of offices
var splitItems = function(items) {
  if (items.length < 2) return items[0] || null;
  var ft = items.reduce((t, d) => t + d.ft, 0);
  var half = ft / 2;
  var lower = half * .8;
  var counter = 0;
  for (var i = 0; i < items.length; i++) {
    counter += items[i].ft;
    if (counter > lower) break;
  }

  return {
    ft,
    left: splitItems(items.slice(0, i + 1)),
    right: splitItems(items.slice(i + 1))
  };
};

//attempt to render to an SVG
var ns = "http://www.w3.org/2000/svg";
var tree = splitItems(window.offices);
var size = Math.sqrt(tree.ft);
var container = $.one(".tree-container");
var svg = $.one("svg.tree-map");
svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
svg.setAttribute("width", size);
svg.setAttribute("height", size);
var caption = $.one(".tree-container .details");

var makeSVG = tag => document.createElementNS(ns, tag);
var setAttributes = (el, attrs) => Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));

var svgRoot = makeSVG("g");
svg.appendChild(svgRoot);

var colorInt = 0;
var palette = [
  colors.palette.stDarkRed,
  colors.palette.stLightRed,
  colors.palette.stDarkOrange,
  colors.palette.stLightGreen,
  colors.palette.stDarkPurple,
  colors.palette.stLightPurple,
  colors.palette.stDarkBlue,
  colors.palette.dfNavy,
  colors.palette.dfDarkGray,
  colors.palette.dfLightGray
].sort();
var getColor = () => palette[colorInt++ % palette.length];

var drawItems = function(node, g, x, y, width, height) {
  var { left, right } = node;
  var tall = width < height;
  [left, right].forEach(function(branch, isRight) {
    var percentage = branch.ft / node.ft;
    var nx, ny, nw, nh;
    if (tall) {
      nw = width;
      nh = height * percentage;
      nx = x;
      ny = isRight ? y + height - nh : y;
    } else {
      nh = height;
      nw = width * percentage;
      ny = y;
      nx = isRight ? x + width - nw : x;
    }
    var group = makeSVG("g");
    group.setAttribute("class", "binary-group");
    g.appendChild(group);
    if (branch.employer) {
      //at a leaf, add a rectangle
      var rect = makeSVG("rect");
      setAttributes(rect, {
        "class": "company",
        x: nx,
        y: ny,
        width: nw,
        height: nh
      });
      group.setAttribute("data-employer", branch.employer);
      rect.style.fill = getColor();
      group.appendChild(rect);
      var focusRect = makeSVG("rect");
      var offset = 10;
      setAttributes(focusRect, {
        "class": "focus-rectangle",
        x: nx + offset,
        y: ny + offset,
        width: nw - offset * 2,
        height: nh - offset * 2,
        "vector-effect": "non-scaling-stroke"
      });
      group.appendChild(focusRect);
      if (branch.employer == "Amazon") {
        var text = makeSVG("text");
        setAttributes(text, {
          x: nx + 30,
          y: ny + 180,
          "class": "company-name"
        });
        text.innerHTML = text.innerText = "Amazon";
        group.appendChild(text);
      }
    } else {
      //otherwise, recurse into the new group
      drawItems(branch, group, nx, ny, nw, nh);
    }
  });
};

drawItems(tree, svgRoot, 0, 0, size, size);

var everyoneElse = $.one(".binary-group:nth-child(2)", svg);
var bounds = everyoneElse.getBBox();
var text = makeSVG("text");
setAttributes(text, {
  x: bounds.x + 30,
  y: bounds.y + 180
});
text.innerHTML = text.innerText = "Everyone else";
everyoneElse.appendChild(text);

var formatBigNumber = function(n) {
  if (n > 1000000) {
    return (n / 1000000).toFixed(2) + "M";
  } else if (n > 1000) {
    return (n / 1000).toFixed(1) + "K";
  } else {
    return n.toLocaleString().replace(/\.0+$/, "");
  }
}

var lastItem = null;
var onPoint = function(e) {
  e.preventDefault();
  var employer = this.getAttribute("data-employer");
  var footage = lookup[employer];
  if (lastItem != employer) {
    caption.innerHTML = `
  <b>${employer}</b>
  <span class="footage">
    ${formatBigNumber(footage)} ft<sup>2</sup>
  </span>
    `;
  }
  lastItem = employer;
  if (e.clientX) {
    var offset = 4;
    var containerBounds = container.getBoundingClientRect();
    var x = e.clientX - containerBounds.left;
    var y = e.clientY - containerBounds.top;
    y -= offset + caption.clientHeight;
    if (e.clientX > window.innerWidth / 2) {
      x -= caption.clientWidth + offset;
    } else {
      x += offset;
    }
    caption.style.left = x + "px";
    caption.style.top = y + "px";
  }
  caption.classList.remove("hide");
};

["mousemove", "click", "touchstart"].forEach(event => delegate(svg, event, "[data-employer]", onPoint));
svg.addEventListener("mouseleave", () => caption.classList.add("hide"));
