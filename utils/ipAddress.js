function getLanIPAddress() {
  var os = require('os');
  var ifaces = os.networkInterfaces();

  let ipv4;

  // Return undefined if the interface is down or not available.
  if (!Object.prototype.hasOwnProperty.call(ifaces, 'eth0')) {
    return undefined;
  }

  for (const config of ifaces.eth0) {
    if (config.family === 'IPv4') {
      ipv4 = 'http://' + config.address;
    }
  }

  return ipv4;
}

module.exports = {
  getLanIPAddress,
};
