import './style.css'

// The standalone workbench loads only on this game's page.
void import('./main').catch(() => {
  document.querySelector('#app')!.textContent = 'The instrument case could not open. Please reload to try again.'
})
