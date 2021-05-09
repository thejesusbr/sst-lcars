$( document ).ready(() => {
  $('body').prepend(LCARS.create(gameHud).dom)
  toggleConsole({target: {id: 'hlm-cns-btn'}})
})

$(() => {
  lcarsAudio.initialize(audDummy)
})