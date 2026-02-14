'use client'

import type { MapDestination } from './MapboxGlobeMap'

// ─── Marker element factory ──────────────────────────────────────────────────

/**
 * Creates a custom HTML element for a Mapbox GL marker.
 * Three visual types: visited (sage), nomadays (turquoise glow), wishlist (terracotta dashed).
 */
export function createMarkerElement(
  dest: MapDestination,
  onClick: (dest: MapDestination) => void,
): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.className = `map-marker map-marker--${dest.status}`
  wrapper.dataset.destinationId = dest.id
  wrapper.setAttribute('role', 'button')
  wrapper.setAttribute('tabindex', '0')
  wrapper.setAttribute(
    'aria-label',
    `${dest.country} — ${statusLabel(dest.status)}`,
  )

  // Circle
  const circle = document.createElement('div')
  circle.className = 'map-marker__circle'

  if (dest.status === 'wishlist') {
    // Wishlist: heart icon (SVG inline — HeartStraight duotone style)
    circle.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M128,216S28,160,28,92A52,52,0,0,1,128,72,52,52,0,0,1,228,92C228,160,128,216,128,216Z"
              fill="#DD9371" fill-opacity="0.2" stroke="#DD9371" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
  } else if (dest.heroPhotoUrl) {
    // Visited / Nomadays with photo
    circle.style.backgroundImage = `url(${dest.heroPhotoUrl})`
    circle.style.backgroundSize = 'cover'
    circle.style.backgroundPosition = 'center'
  } else {
    // Fallback: country code text
    const fallback = document.createElement('span')
    fallback.className = 'map-marker__fallback'
    fallback.textContent = dest.countryCode
    circle.appendChild(fallback)
  }

  wrapper.appendChild(circle)

  // Badge (visited: check, nomadays: airplane)
  if (dest.status === 'visited' || dest.status === 'nomadays') {
    const badge = document.createElement('div')
    badge.className = 'map-marker__badge'

    if (dest.status === 'visited') {
      // Check icon
      badge.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 256 256" fill="none">
          <polyline points="40,128 96,184 216,64" stroke="white" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      `
    } else {
      // Airplane icon
      badge.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 256 256" fill="none">
          <path d="M128,24,88,64H40L128,152l88-88H168Z" fill="white" fill-opacity="0.8"/>
          <line x1="128" y1="152" x2="128" y2="232" stroke="white" stroke-width="20" stroke-linecap="round"/>
          <line x1="96" y1="200" x2="160" y2="200" stroke="white" stroke-width="20" stroke-linecap="round"/>
        </svg>
      `
    }

    circle.appendChild(badge)
  }

  // Click handler
  wrapper.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick(dest)
  })

  // Keyboard handler
  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(dest)
    }
  })

  return wrapper
}

// ─── Highlight / unhighlight ─────────────────────────────────────────────────

export function highlightMarkerElement(el: HTMLElement) {
  el.classList.add('map-marker--highlighted')
}

export function unhighlightMarkerElement(el: HTMLElement) {
  el.classList.remove('map-marker--highlighted')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(status: MapDestination['status']): string {
  switch (status) {
    case 'visited':
      return 'Voyage effectué'
    case 'nomadays':
      return 'Voyage en cours'
    case 'wishlist':
      return 'Envie de voyage'
    default:
      return ''
  }
}
