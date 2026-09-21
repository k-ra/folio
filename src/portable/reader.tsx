import { hydrateRoot } from 'react-dom/client'
import { useEffect } from 'react'
import PublishedStory from './PublishedStory'
const data = JSON.parse(document.getElementById('folio-data')!.textContent!)
function Reader() {
  useEffect(() => {
    document.body.dataset.folioReady = 'true'
  }, [])
  return <PublishedStory story={data} />
}
hydrateRoot(document.getElementById('folio-reader')!, <Reader />)
