
// Socket.io replaces all ArrayBuffers with node.js Buffer objects
// Convert them back before sending to freedom
var replaceBuffers = function(data) {
  "use strict";
  if (data instanceof Buffer) {
    return new Uint8Array(data).buffer;
  } else if (Array.isArray(data)) {
    return data.map(replaceBuffers);
  } else if (typeof data === "object") {
    for (var k in data) {
      if (data.hasOwnProperty(k)) {
        data[k] = replaceBuffers(data[k]);
      }
    }
    Object.keys(data).forEach(function(data, elt) {
      data[elt] = replaceBuffers(data[elt]);
    }.bind({}, data));
    return data;
  } else {
    return data;
  }
};

module.exports.replaceBuffers = replaceBuffers;
