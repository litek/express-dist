var express = require("express"),
    request = require("supertest"),
    dist = require("../index.js");

describe("express-dist", function() {
  var css = require("fs").readFileSync("test/fixtures/style.css", "utf8");
  var map = require("./fixtures/map.json");

  var isValid = function(done) {
    return function(err, res) {
      if (err) return done(err);
      res.status.should.equal(200);
      res.text.should.equal(css);
      done();
    };
  };

  it("serves static assets", function(done) {
    var app = express();
    app.use("/assets", dist("test/fixtures"));

    request(app)
      .get("/assets/style.css")
      .end(isValid(done));
  });

  it("supports virtual hosts", function(done) {
    var app = express();
    app.use("/assets", dist({
      root: "test/fixtures",
      vhost: "cdn.example.com"
    }));

    request(app)
      .get("/assets/style.css")
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);

        request(app)
          .get("/assets/style.css")
          .set("Host", "cdn.example.com")
          .end(isValid(done));
      });
  });

  it("serves files with hash", function(done) {
    var app = express();
    app.use("/assets", dist({
      root: "test/fixtures",
      map: map
    }));

    request(app)
      .get("/assets/sub/file-"+map["sub/file.css"]+".css")
      .end(isValid(done));
  });

  it("creates view helpers", function() {
    var app = {locals: {}, get: function() {
      return "production"
    }};
    
    dist.helper(app, {
      helper: "assets",
      map: map,
      href: "/assets"
    });

    app.locals.assets("style.css").should.equal("/assets/style-"+map["style.css"]+".css");
  });
});
