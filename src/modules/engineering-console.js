var engineeringConsole = {
  type: "row",
  id: "engCnsDsp",
  flexc: "h",
  style: { "justify-content": "space-evenly" },
  children: [
    {
      // engMtxPnl begin
      type: "column",
      flex: "v",
      style: {
        "justify-content": "center",
        "align-items": "center",
        width: "25rem",
      },
      children: [
        {
          type: "title",
          verstion: "centered",
          size: "small",
          text: "Energy Matrix",
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
          type: "block",
          size: "large",
          color: randColor(),
        },
      ],
    }, // engMtxPnl end
    {
      type: "column",
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
