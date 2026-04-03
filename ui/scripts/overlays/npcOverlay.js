// scripts/overlays/npcOverlay.js
// Fetches live NPC location data from a local server endpoint and renders them
// as a clustered marker layer on the map.
//
// NOTE: This overlay is not yet wired into the main bootstrap (work in progress).

import { getIcons } from '../modules/icons.js'

/**
 * Fetches NPC positions from the `/npcloc` endpoint and returns a populated
 * marker cluster group ready to be added to the map.
 *
 * @returns {Promise<L.MarkerClusterGroup>}
 */
export async function createNpcLayer() {
    const url = '/npcloc'
    const icons = getIcons()

    const cluster = L.markerClusterGroup({
        chunkedLoading: true,
        disableClusteringAtZoom: 8,
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
    })

    try {
        const response = await fetch(url)
        const data = await response.json()

        data.forEach((npc) => {
            const marker = L.marker([npc.locy, npc.locx], {
                icon: icons.yellowNpc,
                id: npc.entityid,
            }).bindPopup(npc.literalValue)

            cluster.addLayer(marker)
        })
    } catch (error) {
        console.error(`Failed to fetch NPC locations from ${url}:`, error)
    }

    return cluster
}
