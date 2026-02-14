import type { DestinationAgency, ExplorerContinent } from '@/lib/types/explorer'
import { EXPLORER_MARKER_COLORS } from '@/lib/types/explorer'

// MapPin duotone SVG (white, 16px) — matches Phosphor Icons MapPin duotone
const MAP_PIN_SVG = `<svg width="16" height="16" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M128,24A80,80,0,0,0,48,104c0,72,80,128,80,128s80-56,80-128A80,80,0,0,0,128,24Zm0,112a32,32,0,1,1,32-32A32,32,0,0,1,128,136Z" fill="white" fill-opacity="0.3"/>
  <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Z" fill="white"/>
  <path d="M128,16A88.1,88.1,0,0,0,40,104c0,31.4,14.51,64.68,42,96.22a254.07,254.07,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.07,254.07,0,0,0,174,200.22c27.45-31.54,42-64.82,42-96.22A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z" fill="white"/>
</svg>`

export function createExplorerMarkerElement(
  agency: DestinationAgency,
  onClick: (agency: DestinationAgency) => void,
): HTMLDivElement {
  const color = EXPLORER_MARKER_COLORS[agency.continent as ExplorerContinent] || '#636E72'

  const wrapper = document.createElement('div')
  wrapper.className = 'explorer-marker'
  wrapper.dataset.agencyId = agency.id
  wrapper.dataset.continent = agency.continent
  wrapper.setAttribute('role', 'button')
  wrapper.setAttribute('tabindex', '0')
  wrapper.setAttribute('aria-label', `${agency.country_name} — ${agency.name}`)

  // Circle with continent color
  const circle = document.createElement('div')
  circle.className = 'explorer-marker__circle'
  circle.style.backgroundColor = color

  // White MapPin icon inside
  const icon = document.createElement('span')
  icon.className = 'explorer-marker__icon'
  icon.innerHTML = MAP_PIN_SVG
  circle.appendChild(icon)

  wrapper.appendChild(circle)

  // Click
  wrapper.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick(agency)
  })

  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(agency)
    }
  })

  return wrapper
}

export function highlightExplorerMarker(el: HTMLElement) {
  el.classList.add('explorer-marker--selected')
}

export function unhighlightExplorerMarker(el: HTMLElement) {
  el.classList.remove('explorer-marker--selected')
}
