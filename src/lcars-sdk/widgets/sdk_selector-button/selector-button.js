//Check and Add Widget Group Namespace
if (!LCARS.element.sdk) {
  LCARS.element.sdk = {};
}
//Setup LCARS Base Element Prototype Object
LCARS.element.sdk.selectorButton = function (oDef) {
  //Begin Required
  this.data = {
    type: "selectorButton",
    id:
      oDef.id || "selectorButtonSID" + Math.random().toString(36).substr(2, 9),
    namespace: "sdk",
    version: "horizontal",
    valueList: oDef.valueList || null,
    selected: 0,
    value: oDef.valueList[0] || null,
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

LCARS.element.sdk.selectorButton.prototype = {
  //Required.  Create DOM element and base class
  create: function (oDef) {
    if (!oDef.valueList) throw "No value list passed.";
    var element = $(
      '<div id="' + this.data.id + '" class="sdk selector-button"></div>'
    );
    this.elements.complexButton = LCARS.create({ type: "complexButton" });
    this.elements.button = LCARS.create({
      type: "button",
      label: oDef.label || "",
    });
    this.elements.dsp = LCARS.create({
      type: "text",
      text: this.data.valueList[0] || "0",
    });
    this.elements.dec = LCARS.create({ type: "block", version: "decorator" });

    this.elements.button.dom[0].addEventListener("click", () => {
      this.cycle();
    });

    this.elements.complexButton.dom.append(this.elements.button.dom);
    this.elements.complexButton.dom.append(this.elements.dsp.dom);
    this.elements.complexButton.dom.append(this.elements.dec.dom);

    element.append(this.elements.complexButton.dom);

    return element;
  },
  //Overide global settings
  setting: {
    color: function (object, value) {
      if (value === null) {
        object.data.color = null;
        object.elements.button.set("color", null);
        object.elements.dec.set("color", null);
      } else if (typeof value === "string") {
        object.data.color = value;
        object.elements.button.set("color", value);
        object.elements.dec.set("color", value);
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

  cycle: function () {
    let l = this.data.valueList.length;
    this.data.selected = (this.data.selected + 1) % l;
    this.data.value = this.data.valueList[this.data.selected];
    this.elements.dsp.set("text", this.data.valueList[this.data.selected]);
  },
};
