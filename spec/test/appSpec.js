var app = require("../../app.js");
//getDistance
describe("getDistance", function(){

  it("getDistance calculates correct values for positive number input", function() {
    //arrange
    expect(app.getDistance(2, 2, 2, 2)).toEqual(0);

  });
});

//getSmallest
describe("getSmallest", function(){

  it("getSmallest finds the smallest object from array given as input", function() {
    //arrange
    var array = [1, 2, 3, 4, 5];
    expect(app.getSmallest(array)).toEqual(1);

  });
});

//getSmallest
describe("countActivePlayers", function(){

  it("countActivePlayers counts the number of players playing", function() {
    //arrange
    
    expect(app.getSmallest(array)).toEqual(1);

  });
});
