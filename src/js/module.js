function randColor() {
  return LCARS.helper.aRandColor(lcars.colors.primary);
}

function toggleConsole(e) {
  $('#tct-cns-ctn').empty();
  let console;
  switch(e.target.id) {
    case 'hlm-cns-btn':
      console = helmConsole;
      break;
    case 'shd-cns-btn':
      console = shieldConsole;
      break;
    case 'wpn-cns-btn':
      console = weaponsConsole;
      break;
    case 'sns-cns-btn':
      console = sensorsConsole;
      break;
    case 'nav-cns-btn':
      console = navConsole;
      break;
  }
  $('#tct-cns-ctn').append(console.dom)
}

let helmConsole = LCARS.create({
  type: 'row',
  id: 'hlm-cns-dsp',
  children: [
    {
      type: 'column',
      id: 'dst-pnl',
      children: [
        {
          id: 'tst-btn',
          type: 'button',
          color: randColor(),
          label: "Helm"
        }
      ]
    }, // dst-pnl
  ]
})

let shieldConsole = LCARS.create({
  type: 'row',
  id: 'shd-cns-dsp',
  children: [
    {
      type: 'column',
      id: 'shd-sts-pnl',
      children: [
        {
          type: 'button',
          label: 'shield',  
          color: randColor()
        }
      ]
    }, // dst-pnl
  ]
})

let weaponsConsole = LCARS.create({
  type: 'row',
  id: 'wpn-cns-dsp',
  children: [
    {
      type: 'column',
      children: [
        {
          type: 'button',
          label: 'Weapons',  
          color: randColor()
        }
      ]
    }, // dst-pnl
  ]
})

let sensorsConsole = LCARS.create({
  type: 'row',
  id: 'sns-cns-dsp',
  children: [
    {
      type: 'column',
      children: [
        {
          type: 'button',
          label: 'Sensors',  
          color: randColor()
        }
      ]
    }, // dst-pnl
  ]
})

let navConsole = LCARS.create({
  type: 'row',
  id: 'nav-cns-dsp',
  children: [
    {
      type: 'column',
      children: [
        {
          type: 'button',
          label: 'navigation',  
          color: randColor()
        }
      ]
    }, // dst-pnl
  ]
})

let gameHud = {
  type:'wrapper',
  id:'main-scr',
  version: 'column',
  flex: 'v',
  style: {'height':'100%'},
  children: [
    {
      type: 'row',
      id: 'stn-pnl',
      children: [
        {
          type: 'column',
          flex: 'v',
          id: 'stn-pnl-mnu',
          style: {'width':'7.5rem'},
          children: [
            {type: 'block', label: '9876 54', color: lcars.colors.primary[0]},
            {type: 'block', flexc: 'v', color: lcars.colors.primary[0]},
            {type: 'elbow', version: 'horizontal', direction: 'bottom-left', size: 'medium', color: lcars.colors.primary[0]}
          ]
        }, // stn-pnl-mnu
        {
          type: 'wrapper',
          id: 'stn-pnl-scr',
          flex: 'v',
          flexc: 'h',
          children: [
            {
              type: 'row',
              style: {'flex-direction':'row-reverse'},
              children: [
                {
                  type: 'title',
                  size: 'small',
                  color: 'text-white',
                  text: 'Situation Panel'
                }
              ]
            }, // stn-pnl-tit
            {
              type: 'wrapper',
              id: 'stn-pnl-ctn',
              version: 'row',
              flex: 'h',
              flexc: 'v',
              style: {'justify-content':'space-evenly', 'width':'100%', 'padding':'.35rem 0'},
              children: [
                {
                  type: 'wrapper',
                  id: 'tct-sit-dsp',
                  version: 'column',
                  children: [
                    {
                      type:'complexButton',
                      color: randColor(),
                      noEvent: true,
                      children: [
                        {
                          type: 'cap',
                          version: 'round-left'
                        },
                        {
                          type: 'button',
                          label: 'Energy Level',
                          style: {'width': '7.5rem'}
                        },
                        {
                          type: 'text',
                          color: 'text-white',
                          text: '3000'
                        },
                        {
                          type: 'block',
                          label: 'Nominal',
                          style: {'width':'7.5rem'}
                        }
                      ]
                    }, // eng-lvl-ind
                    {
                      type:'complexButton',
                      color: randColor(),
                      noEvent: true,
                      children: [
                        {
                          type: 'block',
                          style: {'background': 'transparent','width':'3rem'}
                        },
                        {
                          type: 'button',
                          label: 'Stardate',
                          style: {'width': '7.5rem'}
                        },
                        {
                          type: 'block'
                        },
                        {
                          type: 'text',
                          color: 'text-white',
                          text: '3600.0'
                        },
                        {
                          type: 'block',
                          style: {'width':'7.5rem'}
                        }
                      ]
                    }, // sdt-ind
                    {
                      type:'complexButton',
                      color: randColor(),
                      noEvent: true,
                      children: [
                        {
                          type: 'cap',
                          version: 'round-left blink'
                        },
                        {
                          type: 'button',
                          label: 'Enemies Left',
                          style: {'width': '7.5rem'}
                        },
                        {
                          type: 'text',
                          color: 'text-white',
                          text: '12'
                        },
                        {
                          type: 'button',
                          version: 'round-right',
                          style: {'width':'7.5rem'}
                        }
                      ]
                    }, // emy-lft-ind
                    {
                      type:'complexButton',
                      color: randColor(),
                      noEvent: true,
                      children: [
                        {
                          type: 'block',
                          style: {'background': 'transparent','width':'3rem'}
                        },
                        {
                          type: 'button',
                          label: 'Starbases Left',
                          style: {'width': '7.5rem'}
                        },
                        {
                          type: 'block'
                        },
                        {
                          type: 'text',
                          color: 'text-white',
                          text: '14'
                        },
                        {
                          type: 'block',
                          label: 'Nominal',
                          style: {'width':'7.5rem'}
                        }
                      ]
                    }, // stb-lft-ind
                  ]
                }, // tct-sit-dsp
                {
                  type: 'wrapper',                
                  version: 'column',
                  children: [
                    {
                      type: 'button',
                      label: 'Toggle Red Alert',
                      color: randColor(),
                      click: () => {
                        if(!document.body.classList.contains('red-alert'))
                          document.body.classList.add('red-alert')
                        else
                          document.body.classList.remove('red-alert')
                      }
                    }
                  ]
                } // ???
              ]
            }, // stn-pnl-ctn
            {
              type: 'row',
              id: 'stn-pnl-ftr',
              version: 'frame',
              style: {'padding':'0 .25rem'},
              children: [
                {
                  type: 'bar',
                  style: {'width':'7.5rem'},
                  color: lcars.colors.primary[0],
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
            } // stn-pnl-ftr
          ]
        } // stn-pnl-scr
      ]
    }, // stn-pnl
  ]
}

let tctConsole = {
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
          children: [
            {
              id: 'act-cns',
              type: 'wrapper'}
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

gameHud.children.push(tctConsole);

$( document ).ready(function() {
  $('body').append(LCARS.create(gameHud).dom );
});