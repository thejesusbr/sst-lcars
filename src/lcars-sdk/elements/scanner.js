//Setup LCARS Base Element Prototype Object
LCARS.element.scanner = function (oDef) {
  //Begin Required
  this.data = {
    type: "scanner",
    id: oDef.id || "scannerSID" + Math.random().toString(36).substr(2, 9),
    height: oDef.height || 3,
    width: oDef.width || 3,
  };

  this.receiver = {};
  this.event = {};
  this.broadcast = {};
  this.delete = {};
  this.elements = {};
  this.dom = this.create(oDef);

  LCARS.active[this.data.id] = this;

  for (var prop in oDef) {
    this.data[prop] = oDef[prop];
  }

  for (var prop in oDef) {
    if (typeof this.setting[prop] === "function") {
      this.setting[prop](this, oDef[prop]);
    } else if (typeof LCARS.setting[prop] === "function") {
      LCARS.setting[prop](this, oDef[prop]);
    }
  }

  return LCARS.active[this.data.id];
  //End Required
};

LCARS.element.scanner.prototype = {
  //Required.  Create DOM element and base class
  create: function (oDef) {
    var element = $('<div id="' + this.data.id + '" class="scanner"></div>');

    for (var i = 0; i < this.data.height + 1; i++) {
      for (var j = 0; j < this.data.width + 1; j++) {
        let item = $(
          '<div id="' +
            this.data.id +
            "X" +
            i +
            "Y" +
            j +
            '" class="item"></div>'
        );
        if ((i == 0 && j > 0) || (i > 0 && j == 0)) {
          item.append($('<span class="text-light">' + (i + j) + "</span>"));
        }
        element.append(item);
      }
    }

    return element;
  },

  //Custom & Overide global settings
  setting: {
    coloring: function (object, value) {
      var elbows = object.dom.children(".elbow");
      var columns = object.dom.children(".column");
      var animated = object.dom
        .children(".column")
        .children(".bar")
        .children(".animated");
      if (typeof value.elbow === "string") {
        for (var i = 0; i < elbows.length; i++) {
          var sID = elbows[i].getAttribute("id");
          LCARS.active[sID].set("color", value.elbow);
        }
      }
      if (typeof value.animated === "string") {
        for (var i = 0; i < animated.length; i++) {
          var sID = animated[i].getAttribute("id");
          LCARS.active[sID].set("color", value.animated);
        }
      }
      if (Array.isArray(value.column1)) {
        var sID = columns[0].getAttribute("id");
        LCARS.active[sID].set("colors", value.column1);
      }
      if (Array.isArray(value.column2)) {
        var sID = columns[1].getAttribute("id");
        LCARS.active[sID].set("colors", value.column2);
      }
      if (Array.isArray(value.column3)) {
        var sID = columns[2].getAttribute("id");
        LCARS.active[sID].set("colors", value.column3);
      }
      if (Array.isArray(value.column4)) {
        var sID = columns[3].getAttribute("id");
        LCARS.active[sID].set("colors", value.column4);
      }
      return true;
    },
    content: function (object, value) {
      if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
          var type = value[i].type;
          var child = new LCARS.element[type](value[i]);
          object.elements.content.dom.append(child.dom);
        }
      } else if (typeof value === "string") {
        object.elements.content.dom.append(value);
      }
      return true;
    },
  },
  //Required. Set Value by Setting Name | Ignores ID & Type
  set: function (setting, value) {
    if (setting !== "id" && setting !== "type") {
      if (typeof this.setting[setting] === "function") {
        return this.setting[setting](this, value);
      } else if (typeof LCARS.setting[setting] === "function") {
        return LCARS.setting[setting](this, value);
      } else {
        this.data[setting] = value;
        return true;
      }
    }
  },

  get: function (setting) {
    return this.data[setting];
  },
};
