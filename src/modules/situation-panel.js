let situationPanel = {
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
                  noEvente: false,
                  children: [
                    {
                      type: 'cap',
                      version: 'round-left'
                    },
                    {
                      type: 'block',
                      label: 'Energy Level',
                      style: {'flex':'none', 'width': '7.5rem'}
                    },
                    {
                      type: 'text',
                      color: 'text-white',
                      style: {'width': '10.55rem'},
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
                  noEvente: false,
                  children: [
                    {
                      type: 'block',
                      style: {'background': 'transparent','width':'3rem'}
                    },
                    {
                      type: 'block',
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
                  noEvente: false,
                  children: [
                    {
                      type: 'cap',
                      version: 'round-left blink'
                    },
                    {
                      type: 'block',
                      label: 'Enemies Left',
                      style: {'flex':'none', 'width': '7.5rem'}
                    },
                    {
                      type: 'text',
                      color: 'text-white',
                      style: {'width': '10.55rem'},
                      text: '12'
                    },
                    {
                      type: 'block',
                      version: 'round-right',
                      style: {'flex':'none', 'width':'7.5rem'}
                    }
                  ]
                }, // emy-lft-ind
                {
                  type:'complexButton',
                  color: randColor(),
                  noEvente: false,
                  children: [
                    {
                      type: 'block',
                      style: {'background': 'transparent','width':'3rem'}
                    },
                    {
                      type: 'block',
                      label: 'Starbases Left',
                      style: {'flex':'none', 'width': '7.5rem'}
                    },
                    {
                      type: 'block'
                    },
                    {
                      type: 'text',
                      color: 'text-white',
                      style: {'width': '9.25rem'},
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
} // stn-pnl