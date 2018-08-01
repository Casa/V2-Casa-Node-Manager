/*
https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
https://www.ietf.org/rfc/rfc4122.txt
Create a unique identifier
*/
function create() {
  return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

module.exports = {
  create: create
}