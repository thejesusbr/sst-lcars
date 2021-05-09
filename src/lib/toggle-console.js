function toggleConsole(e) {
  $('#tct-cns-ctn > *').addClass('hide')
  switch(e.target.id) {
    case 'hlm-cns-btn':
      $('#hlm-cns-dsp')[0].classList.toggle('hide')
      break;
    case 'shd-cns-btn':
      $('#shd-cns-dsp')[0].classList.toggle('hide')
      break;
    case 'wpn-cns-btn':
      $('#wpn-cns-dsp')[0].classList.toggle('hide')
      break;
    case 'sns-cns-btn':
      $('#sns-cns-dsp')[0].classList.toggle('hide')
      break;
    case 'nav-cns-btn':
      $('#nav-cns-dsp')[0].classList.toggle('hide')
      break;
  }
}