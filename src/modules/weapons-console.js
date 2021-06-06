function toggle() {
  this.dom[0].children[0].classList.add("transparent");
  this.dom[0].children[1].classList.remove("transparent");
  this.dom[0].children[2].classList.remove("off");
  this.dom[0].children[2].innerText = "on";
  if (this.data.toggle) {
    this.dom[0].children[0];
  } else {
    this.dom[0].children[1].classList.add("transparent");
    this.dom[0].children[0].classList.remove("transparent");
    this.dom[0].children[0].style.setProperty("filter", "brightness(0.5)");
    this.dom[0].children[2].classList.add("off");
    this.dom[0].children[2].innerText = "off";
  }
}

var weaponsConsole = {
  type: "row",
  id: "wpn-cns-dsp",
  flex: "h",
  flexc: "h",
  style: { "justify-content": "space-evenly" },
  children: [
    {
      type: "column",
      id: "phs-ctr-pnl",
      flex: "v",
      style: {
        "justify-content": "center",
        "align-items": "center",
      },
      children: [
        {
          type: "title",
          version: "centered",
          text: "Phaser Bank Control",
          color: "text-white",
          size: "small",
        }, // title
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "cap",
              version: "round-left",
            },
            {
              type: "block",
              label: "Temperature",
              style: { width: "15rem" },
            },
            {
              type: "solidLevelBar", // TODO: substituir por slider
              id: "phs-tmp-ind",
              namespace: "sdk",
              version: "horizontal",
              max: 270,
              min: 0,
              color: "bg-blue-1",
              level: 50, // TODO: fazer a barra funcionar completamente
              label: "50",
            },
            {
              type: "cap",
              version: "round-right",
            },
          ],
        },
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "cap",
              version: "round-left",
            },
            {
              type: "block",
              label: "Effectiveness",
              style: { width: "15rem" },
            },
            {
              type: "solidLevelBar", // TODO: substituir por slider
              id: "phs-eff-ind",
              namespace: "sdk",
              version: "horizontal",
              max: 100,
              min: 0,
              color: "bg-blue-1",
              level: 100, // TODO: fazer a barra funcionar completamente
              label: "100",
            },
            {
              type: "cap",
              version: "round-right",
            },
          ],
        },
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "cap",
              version: "round-left",
            },
            {
              type: "block",
              label: "Set Power Output",
              style: { width: "15rem" },
            },
            {
              type: "solidLevelBar", // TODO: substituir por slider
              id: "phs-out-ind",
              namespace: "sdk",
              version: "horizontal",
              max: 3000,
              min: 0,
              color: "bg-blue-1",
              level: 1000, // TODO: fazer a barra funcionar completamente
              label: "1000",
            },
            {
              type: "cap",
              version: "round-right",
            },
          ],
        },
        {
          type: "row",
          flex: "h",
          style: { "justify-content": "space-between" },
          children: [
            {
              type: "button",
              id: "phs-lck-btn",
              version: "round",
              label: "Lock",
              color: randColor(),
              style: { width: "7.5rem" },
            },
            {
              type: "complexButton",
              color: randColor(),
              children: [
                {
                  type: "block",
                  label: "Targets locked",
                  style: { width: "15rem" },
                },
                {
                  type: "text",
                  id: "phs-lck-eny-ind",
                  text: "0",
                },
              ],
            },
          ],
        },
        {
          type: "button",
          color: randColor(),
          label: "Fire",
          version: "round dark-light",
          style: { width: "90%" },
        },
      ],
    }, // phs-ctr-pnl
    {
      type: "column",
      id: "tpd-tgt-pnl",
      flex: "v",
      style: { "justify-content": "center" },
      children: [
        {
          type: "title",
          version: "centered",
          text: "Torpedo targeting",
          color: "text-white",
          size: "small",
        },
        {
          type: "defaultBracket",
          id: "tpd-tgt-vwr",
          namespace: "sdk",
          style: {
            height: "250px",
            width: "445px",
          },
          coloring: {
            elbow: "bg-green-4",
            column1: ["bg-blue-1", "bg-green-2", "bg-blue-1"],
            column2: ["bg-blue-3", "bg-green-4", "bg-blue-3"],
            column3: ["bg-blue-1", "bg-green-2", "bg-blue-1"],
            column4: ["bg-blue-3", "bg-green-4", "bg-blue-3"],
            animated: "bg-red-1",
          },
          content: [
            {
              type: "htmlTag",
              id: "tpd-tgt-vwr-scr",
              tag: "canvas",
              style: { height: "100%", width: "100%" }, // TODO: configurar starfield
            },
          ],
        }, // tpd-tgt-vwr
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "block",
              label: "Tube 1",
            },
            {
              type: "block",
              version: "decorator",
            },
            {
              type: "text",
              id: "tpd-tb1-tgt-x",
              text: "1",
            },
            {
              type: "block",
              version: "decorator",
            },
            {
              type: "text",
              id: "tpd-tb1-tgt-y",
              text: "1",
            },
            {
              type: "button",
              id: "tpd-tgt-cyc-tb1",
              version: "round",
              color: randColor(),
              label: "Cycle",
            },
          ],
        },
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "block",
              label: "Tube 2",
            },
            {
              type: "block",
              version: "decorator",
            },
            {
              type: "text",
              id: "tpd-tb2-tgt-x",
              text: "1",
            },
            {
              type: "block",
              version: "decorator",
            },
            {
              type: "text",
              id: "tpd-tb2-tgt-y",
              text: "1",
            },
            {
              type: "button",
              id: "tpd-tgt-cyc-tb2",
              version: "round",
              color: randColor(),
              label: "Cycle",
            },
          ],
        },
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "block",
              label: "Tube 3",
            },
            {
              type: "block",
              version: "decorator",
            },
            {
              type: "text",
              id: "tpd-tb3-tgt-x",
              text: "1",
            },
            {
              type: "block",
              version: "decorator",
            },
            {
              type: "text",
              id: "tpd-tb3-tgt-y",
              text: "1",
            },
            {
              type: "button",
              id: "tpd-tgt-cyc-tb3",
              version: "round",
              color: randColor(),
              label: "Cycle",
            },
          ],
        },
      ],
    }, // tpd-tgt-pnl
    {
      type: "column",
      flex: "v",
      style: { justifyContent: "center", alignItems: "center" },
      id: "tpd-ctr-pnl",
      children: [
        {
          type: "title",
          version: "centered",
          text: "Torpedo Control",
          color: "text-white",
          size: "small",
        },
        {
          type: "complexButton",
          color: randColor(),
          style: { width: "450px" },
          children: [
            {
              type: "cap",
              version: "round-left",
            },
            {
              type: "block",
              label: "Stock",
              style: { width: "7.5rem" },
            },
            {
              type: "solidLevelBar", // TODO: substituir por slider
              id: "tpd-stk-ind",
              namespace: "sdk",
              version: "horizontal",
              max: 12,
              min: 0,
              color: "bg-blue-1",
              level: 8, // TODO: fazer a barra funcionar completamente
              label: "8",
            },
            {
              type: "cap",
              version: "round-right",
            },
          ],
        },
        {
          type: "row",
          flex: "h",
          style: { "justify-content": "space-evenly" },
          children: [
            {
              type: "title",
              text: "Tubes",
              size: "small",
            },
            {
              type: "title",
              text: "Auto-load",
              size: "small",
            },
            {
              type: "title",
              text: "Status",
              size: "small",
            },
          ],
        },
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "button",
              id: "tpd-lod-tb1",
              version: "round",
              label: "Load",
            },
            {
              type: "text",
              text: "1",
              style: { width: "3.75rem", "min-width": "unset" },
            },
            {
              type: "complexButton",
              color: randColor(),
              toggle: false,
              style: { "min-width": "unset" },
              children: [
                {
                  type: "block",
                  style: { filter: "brightness(0.5)" },
                  version: "check",
                },
                {
                  type: "block",
                  version: "check transparent",
                },
                {
                  type: "text",
                  color: "text-white",
                  version: "off",
                  text: "off",
                },
              ],
              click: toggle,
            },
            {
              type: "block",
              id: "tpd-sts-ind-tb1",
              version: "red-dark-light",
              label: "Empty",
            },
          ],
        }, // ctr-tb1
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "button",
              id: "tpd-lod-tb1",
              version: "round",
              label: "Load",
            },
            {
              type: "text",
              text: "2",
              style: { width: "3.75rem", "min-width": "unset" },
            },
            {
              type: "complexButton",
              color: randColor(),
              toggle: false,
              style: { "min-width": "unset" },
              children: [
                {
                  type: "block",
                  style: { filter: "brightness(0.5)" },
                  version: "check",
                },
                {
                  type: "block",
                  version: "check transparent",
                },
                {
                  type: "text",
                  color: "text-white",
                  version: "off",
                  text: "off",
                },
              ],
              click: toggle,
            },
            {
              type: "block",
              id: "tpd-sts-ind-tb2",
              version: "red-dark-light",
              label: "Empty",
            },
          ],
        }, // ctr-tb2
        {
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "button",
              id: "tpd-lod-tb1",
              version: "round",
              label: "Load",
            },
            {
              type: "text",
              text: "3",
              style: { width: "3.75rem", "min-width": "unset" },
            },
            {
              type: "complexButton",
              color: randColor(),
              toggle: false,
              style: { "min-width": "unset" },
              children: [
                {
                  type: "block",
                  style: { filter: "brightness(0.5)" },
                  version: "check",
                },
                {
                  type: "block",
                  version: "check transparent",
                },
                {
                  type: "text",
                  color: "text-white",
                  version: "off",
                  text: "off",
                },
              ],
              click: toggle,
            },
            {
              type: "block",
              id: "tpd-sts-ind-tb3",
              version: "red-dark-light",
              label: "Empty",
            },
          ],
        }, // ctr-tb3
        {
          type: "button",
          version: "round dark-light",
          label: "Fire",
          color: randColor(),
          style: { width: "90%" },
        },
      ],
    }, // tpd-ctr-pnl
  ],
};
