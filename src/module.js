$( document ).ready(() => {
  $('body').prepend(LCARS.create(gameHud).dom)
  // Gambiarra para inicializar o nível das barras
  for (obj in LCARS.active){
    let ob = LCARS.active[obj]
    if(ob.data.type === 'solidLevelBar')
      ob.set('level', ob.data.level)
  }
  toggleConsole({target: {id: 'hlm-cns-btn'}})
})

$(() => {
  lcarsAudio.initialize(audDummy)
})