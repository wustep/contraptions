import './style.css'

// Music's staged pieces stay behind this experiment's own lazy boundary.
void import('./main').catch(() => {
  document.querySelector('#app')!.textContent = 'The instrument case could not open. Please reload to try again.'
})
