var engineeringConsole = {
  type: "row",
  id: "engCnsDsp",
  flexc: "h",
  style: { "justify-content": "space-evenly" },
  children: [
    {
      // engMtxPnl begin
      type: "column",
      id: "engMtxPnl",
      flex: "v",
      style: { "justify-content": "center" },
      children: [
        {
          type: "title",
          version: "centered",
          text: "Energy Matrix",
          color: "text-white",
          size: "small",
        },
        {
          type: "complexButton",
          color: randColor(),
          size: "large",
          children: [
            {
              type: "cap",
              version: "round-left",
            },
            {
              type: "block",
              label: "Main Energy",
            },
            {
              type: "solidLevelBar", // TODO: substituir por slider
              id: "maiEngInd",
              namespace: "sdk",
              version: "horizontal",
              max: 4500,
              min: 0,
              color: randColor(),
              level: 4500, // TODO: fazer a barra funcionar completamente
              label: "4500",
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
              type: "selectorButton",
              namespace: "sdk",
              color: randColor(),
              label: "Amount",
              valueList: ["250", "500", "1000"],
            },
            {
              type: "cap",
              version: "round-right",
            },
          ],
        },
        // TODO: Substituir por sliders quando prontos
        {
          type: "complexButton",
          id: "engTrfShd",
          color: randColor(),
          children: [
            {
              type: "button",
              id: "engTrfShdDec",
              version: "round-left",
              size: "small",
              label: "-",
              style: { "font-size": "xx-large" },
            },
            {
              type: "block",
              label: "Shields",
            },
            {
              type: "text",
              id: "engTrfShdInd",
              color: "text-white",
              text: "1000",
            },
            {
              type: "button",
              id: "engTrfShdInc",
              version: "round-right",
              size: "small",
              color: randColor(),
              label: "+",
              style: { "font-size": "xx-large" },
            },
          ],
        }, // engTrfShd end
        {
          type: "complexButton",
          id: "engTrfLsp",
          color: randColor(),
          children: [
            {
              type: "button",
              id: "engTrfLspDec",
              version: "round-left",
              size: "small",
              label: "-",
              style: { "font-size": "xx-large" },
            },
            {
              type: "block",
              label: "Life Support",
            },
            {
              type: "text",
              id: "engTrfLspInd",
              color: "text-white",
              text: "1000",
            },
            {
              type: "button",
              id: "engTrfLspInc",
              version: "round-right",
              size: "small",
              color: randColor(),
              label: "+",
              style: { "font-size": "xx-large" },
            },
          ],
        }, // engTrfLsp
        {
          type: "complexButton",
          id: "engTrfImpEng",
          color: randColor(),
          children: [
            {
              type: "button",
              id: "engTrfImpEngDec",
              version: "round-left",
              size: "small",
              label: "-",
              style: { "font-size": "xx-large" },
            },
            {
              type: "block",
              label: "Impulse Engines",
            },
            {
              type: "text",
              id: "engTrfImpEngInd",
              color: "text-white",
              text: "1000",
            },
            {
              type: "button",
              id: "engTrfImpEngInc",
              version: "round-right",
              size: "small",
              color: randColor(),
              label: "+",
              style: { "font-size": "xx-large" },
            },
          ],
        },
      ],
    }, // engMtxPnl end
    {
      type: "column",
      flex: "v",
      style: { "justify-content": "center" },
      children: [
        {
          type: "row",
          style: { "justify-content": "center" },
          children: [
            {
              type: "title",
              version: "centered",
              size: "small",
              text: "Damage Control",
            },
          ],
        },
      ],
    },
  ],
};
