LCARS.element.htmlTag.prototype.create = function(oDef){
    var attr = Object.keys(oDef.attributes)
    var vals = Object.values(oDef.attributes)
    var atr;
    var atrStr = ' ';
    for(atr in attr)
      atrStr += attr[atr]+':"'+vals[atr]+'" '
		var element = $('<'+oDef.tag+' id="'+this.data.id+atrStr+'"></'+this.data.tag+'>');
		return element;	
}

let activeDstToggle = 'sec'

let toggleSysSec = (opt) => {
  if(opt === 'sec')
    activeDstToggle = 'sec'
  if(opt === 'sys')
    activeDstToggle = 'sys'
}

let helmConsole = {
  type: 'row',
  id: 'hlm-cns-dsp',
  class: ['hide'],
  children: [
    {
      type: 'column',
      id: 'dst-pnl',
      style: {'justify-content':'center'},
      flex: 'v',
      children: [
        {
          id: 'cur-pos-ind',
          type: 'complexButton',
          color: randColor(),
          children: [
            {
              type: 'cap',
              version: 'round-left'
            },
            {
              type: 'block',
              label: 'Current Location',
              style: {'width': '7.5rem'}
            },
            {
              type: 'block',
              label: 'System',
              style: {'width': '3.75rem'}
            },
            {
              id: 'cur-loc-sys',
              type: 'text',
              text: '3, 4'
            },
            {
              type: 'block',
              label: 'Sector',
              style: {'width': '3.75rem'}
            },
            {
              id: 'cur-loc-sec',
              type: 'text',
              text: '3, 4'
            },
            {
              type: 'cap',
              version: 'round-right'
            }
          ]
        }, // cur-loc-ind
        {
          type: 'title',
          version: 'small centered',
          text: 'Set Destination',
          color: 'text-white'
        },
        {
          id: 'hlm-dir-pad-wrp',
          type: 'wrapper',
          flex: 'h',
          style: {'justify-content': 'center'},
          children:  [
            {
              id: 'hlm-dir-pad',
              type: 'svg',
              xml: `<svg width="70mm" height="70mm" 
              version="1.1" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" 
              xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                style="display: inline-block; margin: auto">
              <metadata>
                <rdf:rdf>
                  <cc:work rdf:about="">
                    <dc:format>image/svg+xml</dc:format>
                    <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type>
                    <dc:title></dc:title>
                  </cc:work>
                </rdf:rdf>
              </metadata>
              <path id="xy_ctl_NE" class="button bg-blue-2" d="m47 33v-32.35c15.992 2.4474 29.977 16.417 32.424 32.35z"></path>
              <path id="xy_ctl_SW" class="button bg-blue-2" d="m33 47v32.35c-15.992-2.4474-29.977-16.417-32.424-32.35z"></path>
              <path id="xy_ctl_SE" class="button bg-blue-2" d="m47 47v32.35c15.992-2.4474 29.977-16.417 32.424-32.35z"></path>
              <path id="xy_ctl_NW" class="button bg-blue-2" d="m32.977 33v-32.35c-15.992 2.4474-29.977 16.417-32.424 32.35z"></path>
              <path id="xy_ctl_up" class="button bg-blue-4" d="m34 10h12v-9.5c-3.8785-0.47437-8.044-0.4824-12 0z"></path>
              <path d="m44.2 2.2v5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
              <path id="xy_ctl_left" class="button bg-blue-4" d="m10 46v-12h-9.5c-0.47437 3.8785-0.4824 8.044 0 12z"></path>
              <path d="m2.199 35.8h5.0271" style="fill:none;opacity:.889;stroke-width:1.2;stroke:#000000"></path>
              <path id="xy_ctl_right" class="button bg-blue-4" d="m70 34v12h9.5c0.47437-3.8785 0.4824-8.044 0-12z"></path>
              <path d="m77.801 44.2h-5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
              <path id="xy_ctl_down" class="button bg-blue-4" d="m46 70h-12v9.5c3.8785 0.47437 8.044 0.4824 12 0z"></path>
              <path d="m35.8 77.8v-5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
              <path d="m11 34v12h23v23h12v-23h23v-12h-23v-23h-12v23z" class="bg-blue-3"></path>
              <path d="m34 13.49h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
              <path d="m34 16.2h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
              <path d="m34 19.48h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
              <path d="m34 27.9h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
              <path d="m34 59h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
            </svg>`,
            arrive: () => {bindPadButtons()},
            }, // hlm-dir-pad
          ]
        }, // hlm-dir-pad-wrp
        {
          type: 'complexButton',
          id: 'set-dst-inp',
          color: 'bg-blue-2',
          style: {'justify-content':'center'},
          children: [
            {
              type: 'cap',
              version: 'round-left'
            },
            {
              type: 'button',
              label: 'System',
              style: {'width':'3.75rem', 'flex': 'none'},
              click: () => {toggleSysSec('sys')}
            },
            {
              id: 'dst-sec-ind',
              type: 'text',
              text: '4, 3'
            },
            {
              type: 'button',
              label: 'Sector',
              style: {'width':'3.75rem', 'flex': 'none'},
              click: () => {toggleSysSec('sec')}
            },
            {
              id: 'dst-sys-ind',
              type: 'text',
              text: '2, 5'
            },
            {
              type: 'cap',
              version: 'round-right'
            }
          ]
        } // set-dst-inp
      ]
    }, // dst-pnl
    {
      type: 'column',
      id: 'wrp-pnl',
      style: {'justify-content':'center'},
      flex: 'v',
      children: [
        {
          id: 'cur-pos-ind',
          type: 'complexButton',
          color: randColor(),
          children: [
            {
              type: 'cap',
              version: 'round-left'
            },
            {
              type: 'block',
              label: 'Warp Factor',
              style: {'width': '15rem'}
            },
            {
              id: 'wrp-fct',
              type: 'text',
              text: '1.0'
            },
            {
              type: 'cap',
              version: 'round-right'
            }
          ]
        }, // wrp-ind
        {
          type: 'complexButton',
          id: 'wrp-fct-sel',
          children: [
            {
              type: 'solidLevelBar',
              id: 'wrpFctSelBar',
              version: 'horizontal',
              max: 8,
              min: 1,
              namespace: 'sdk',
              color: 'bg-blue-1',
              level: 2, // TODO: fazer a barra funcionar completamente
              label: '2',
            },
          ]
        },
        {
          type: 'button',
          id: 'wrpEng',
          label: 'Engage',
          color: randColor(),
          style: {'width':'15rem', 'flex': 'none'},
        }
      ],
    }, // wrp-pnl
  ]
}

function bindPadButtons() {
  console.log('bindPadButtons')
  let xyCtlUp = document.getElementById('xy_ctl_up')
  xyCtlUp.addEventListener('click', e => {
    console.log(e)
  })
}


/*
<svg width="70mm" height="70mm" version="1.1" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" style="display: inline-block; margin: auto">
  <metadata>
    <rdf:rdf>
      <cc:work rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type>
        <dc:title></dc:title>
      </cc:work>
    </rdf:rdf>
  </metadata>
  <path id="xy_ctl_NE" class="bg-blue-5" d="m47 33v-32.35c15.992 2.4474 29.977 16.417 32.424 32.35z"></path>
  <path id="xy_ctl_SW" class="bg-blue-5" d="m33 47v32.35c-15.992-2.4474-29.977-16.417-32.424-32.35z"></path>
  <path id="xy_ctl_SE" class="bg-blue-5" d="m47 47v32.35c15.992-2.4474 29.977-16.417 32.424-32.35z"></path>
  <path id="xy_ctl_up" class="button bg-blue-3" d="m34 10h12v-9.5c-3.8785-0.47437-8.044-0.4824-12 0z"></path>
  <path d="m44.2 2.2v5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
  <path id="xy_ctl_left" class="button bg-blue-3" d="m10 46v-12h-9.5c-0.47437 3.8785-0.4824 8.044 0 12z"></path>
  <path d="m2.199 35.8h5.0271" style="fill:none;opacity:.889;stroke-width:1.2;stroke:#000000"></path>
  <path id="xy_ctl_right" class="button bg-blue-3" d="m70 34v12h9.5c0.47437-3.8785 0.4824-8.044 0-12z"></path>
  <path d="m77.801 44.2h-5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
  <path id="xy_ctl_down" class="button bg-blue-3" d="m46 70h-12v9.5c3.8785 0.47437 8.044 0.4824 12 0z"></path>
  <path d="m35.8 77.8v-5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
  <path d="m11 34v12h23v23h12v-23h23v-12h-23v-23h-12v23z" class="bg-blue-4"></path>
  <path d="m34 13.49h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path d="m34 16.2h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path d="m34 19.48h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path d="m34 27.9h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path d="m34 59h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path id="xy_ctl_NW" class="bg-blue-5" d="m32.977 33v-32.35c-15.992 2.4474-29.977 16.417-32.424 32.35z"></path>
</svg>
                      */