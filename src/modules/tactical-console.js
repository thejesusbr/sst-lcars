let tacticalConsole = {
  type: 'row',
  id: 'tct-cns',
  flexc: 'v',
  children: [
    {
      type: 'column',
      flex: 'v',
      id: 'tct-cns-mnu',
      style: {'width':'7.5rem'},
      children: [
        {
          type: 'elbow',
          size: 'medium',
          direction: 'top-left no-event',
          color: lcars.colors.primary[7],
        },
        {
          id: 'hlm-cns-btn',
          type: 'button',
          label: 'Helm',
          color: randColor(),
          click: toggleConsole
        },
        {
          id: 'shd-cns-btn',
          type: 'button',
          label: 'Shields',
          color: randColor(),
          click: toggleConsole
        },
        {
          id: 'wpn-cns-btn',
          type: 'button',
          label: 'Weapons',
          color: randColor(),
          click: toggleConsole
        },
        {
          id: 'sns-cns-btn',
          type: 'button',
          label: 'Sensors',
          color: randColor(),
          click: toggleConsole
        },
        {
          id: 'nav-cns-btn',
          type: 'button',
          label: 'Navigation',
          color: randColor(),
          click: toggleConsole
        },
        {
          type: 'block',
          label: '1234 56',
          version: 'dark-light',
          color: randColor()
        },
        {
          type: 'block',
          flexc: 'v',
          color: randColor()
        },
      ]
    }, // tct-cns-mnu
    {
      type: 'wrapper',
      version: 'column',
      flex: 'v',
      flexc: 'h',
      id: 'tct-cns-scr',
      children: [
        {
          type: 'row',
          id: 'tct-cns-hdr',
          version: 'frame',
          style: {'padding':'0 .25rem'},
          children: [
            {
              type: 'bar',
              style: {'width':'7.5rem'},
              color: lcars.colors.primary[7],
            },
            {
              type: 'bar',
              style: {'width':'7.5rem'},
              color: randColor(),
            },
            {
              type: 'bar',
              flexc: 'h',
              color: randColor(),
            },
            {
              type: 'cap',
              version: 'round-right',
              size: 'small',
              color: randColor(),
            },
          ]
        }, // tct-cns-hdr
        {
          type: 'wrapper',
          version: 'row',
          flexc: 'v',
          id: 'tct-cns-ctn',
          style: {'justify-content': 'space-evenly'},
          children: [
            helmConsole,
            shieldConsole,
            weaponsConsole,
            sensorsConsole,
            navConsole
          ]
        }, // tct-cns-ctn
        {
          type: 'row',
          style: {'flex-direction':'row-reverse'},
          children: [
            {
              type: 'title',
              size: 'small',
              color: 'text-white',
              text: 'Tactical Console'
            }
          ]
        }, // stn-pnl-tit
      ]
    }, // tct-cns-scr
  ]
} // tct-cns