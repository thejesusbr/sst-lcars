var navSensingConsole = {
  type: "row",
  id: "nav-cns-dsp",
  flexc: "h",
  style: { "justify-content": "space-evenly" },
  children: [
    {
      // shr-scn-pnl begin
      type: "column",
      id: "shr-scn-pnl",
      flex: "v",
      style: { "justify-content": "center" },
      children: [
        {
          type: "title",
          version: "centered",
          text: "Short-range scanner",
          color: "text-white",
          size: "small",
        },
        {
          type: "row",
          style: { "justify-content": "center" },
          children: [
            {
              // shr-scn-vwr begin
              type: "defaultBracket",
              id: "shr-scn-vwr",
              namespace: "sdk",
              style: {
                height: "21rem",
                width: "24rem",
              },
              coloring: {
                elbow: "tertiary-static",
                column1: [
                  "primary-static",
                  "tertiary-static",
                  "primary-static",
                ],
                column2: [
                  "secondary-static",
                  "tertiary-static",
                  "secondary-static",
                ],
                column3: [
                  "primary-static",
                  "tertiary-static",
                  "primary-static",
                ],
                column4: [
                  "secondary-static",
                  "tertiary-static",
                  "secondary-static",
                ],
                animated: "pale-canary-bg",
              },
              content: [
                {
                  type: "scanner",
                  id: "shtRngScn",
                  version: "short",
                  width: 8,
                  height: 8,
                  color: randColor(),
                },
              ],
            }, // shr-scn-vwr end
          ],
        },
        {
          // snd-hlm-sec begin
          type: "complexButton",
          color: randColor(),
          children: [
            {
              type: "cap",
              version: "round-left",
            },
            {
              type: "block",
              label: "Selected sector",
            },
            {
              type: "text",
              id: "snd-hlm-sec-txt",
              text: "3,4",
            },
            {
              type: "block",
              version: "decorator",
            },
            {
              type: "button",
              id: "tpd-tgt-cyc-tb1",
              version: "round",
              color: randColor(),
              label: "Snd Helm",
            },
          ],
        }, // snd-hlm-sec end
        {
          type: "row",
          style: { justifyContent: "space-evenly" },
          children: [
            {
              type: "button",
              id: "hal-btn",
              version: "round",
              color: randColor(),
              label: "Hail",
            },
            {
              type: "button",
              id: "dck-btn",
              version: "round",
              color: randColor(),
              label: "Dock",
            },
            {
              type: "button",
              id: "snd-prt-btn",
              version: "round",
              color: randColor(),
              label: "Snd Party",
            },
          ],
        },
      ],
    }, // shr-scn-pnl end
    {
      // lgr-scn-pnl begin
      type: "column",
      id: "lgrScPnl",
      flex: "v",
      children: [
        {
          type: "title",
          version: "centered",
          text: "Long range scanner",
          size: "small",
        },
        {
          type: "row",
          style: { "justify-content": "space-evenly" },
          children: [
            {
              // lgr-scn-vwr begin
              type: "defaultBracket",
              id: "lgrScnVwr",
              namespace: "sdk",
              style: {
                height: "21rem",
                width: "42rem",
              },
              coloring: {
                elbow: "tertiary-static",
                column1: [
                  "primary-static",
                  "tertiary-static",
                  "primary-static",
                ],
                column2: [
                  "secondary-static",
                  "tertiary-static",
                  "secondary-static",
                ],
                column3: [
                  "primary-static",
                  "tertiary-static",
                  "primary-static",
                ],
                column4: [
                  "secondary-static",
                  "tertiary-static",
                  "secondary-static",
                ],
                animated: "pale-canary-bg",
              },
              content: [
                {
                  type: "scanner",
                  id: "lngRngScn",
                  version: "long",
                  width: 8,
                  height: 8,
                  color: randColor(),
                },
              ],
            }, // lgr-scn-vwr end
          ],
        },
        {
          type: "row",
          style: { "justify-content": "space-evenly" },
          children: [
            {
              type: "button",
              id: "lngScnBtn",
              version: "round",
              label: "Scan",
              color: randColor(),
            },
            {
              // snd-hlm-sec begin
              type: "complexButton",
              color: randColor(),
              children: [
                {
                  type: "cap",
                  version: "round-left",
                },
                {
                  type: "block",
                  label: "Selected System",
                },
                {
                  type: "text",
                  id: "sndHlmSysTxt",
                  text: "3,4",
                },
                {
                  type: "block",
                  version: "decorator",
                },
              ],
            },
            {
              type: "button",
              id: "sndSysHlm",
              version: "round",
              color: randColor(),
              label: "Snd to Helm",
            },
          ],
        },
        {
          type: "title",
          version: "centered",
          size: "small",
          text: "Probe control",
        },
        {
          type: "row",
          style: { "justify-content": "center" },
          children: [
            {
              // prbCtrGrp
              type: "complexButton",
              color: randColor(),
              children: [
                {
                  type: "cap",
                  version: "round-left",
                },
                {
                  type: "block",
                  label: "Remaining Probes",
                },
                {
                  type: "text",
                  id: "rmnPrbTxt",
                  text: "3",
                },
                {
                  type: "block",
                  version: "decorator",
                },
                {
                  type: "block",
                  id: "prbStsInd",
                  label: "Offline",
                  version: "red-dark-light",
                },
                {
                  type: "button",
                  version: "round-right",
                  size: "large",
                  label: "Send to selected system",
                  color: randColor(),
                },
              ],
            },
          ],
        },
      ],
    }, // lgr-scn-pnl end
  ],
};
