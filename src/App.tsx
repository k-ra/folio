import { useCallback, useState } from 'react'
import { simulated } from './ai'
import Home from './home/Home'
import { useHomeTheme, useStories } from './model/store'
import Write from './write/Write'

const ai = simulated

export default function App({ initialStoryId }: { initialStoryId?: string }) {
  const { stories, setStories, upStory, upBlock, ready, saveError, saving } = useStories()
  const [homeTheme, pickHomeTheme] = useHomeTheme()
  const [view, setView] = useState<{ kind: 'home' } | { kind: 'write'; id: string; isNew: boolean }>(
    initialStoryId ? { kind: 'write', id: initialStoryId, isNew: false } : { kind: 'home' },
  )

  const open = useCallback((id: string, isNew: boolean) => {
    window.scrollTo(0, 0)
    setView({ kind: 'write', id, isNew })
  }, [])

  const goHome = useCallback(() => {
    if (view.kind !== 'write') return
    const active = view.id
    // Last touched floats to the front of the stack.
    setStories((arr) => [...arr].sort((a, b) => (a.id === active ? -1 : b.id === active ? 1 : 0)))
    window.scrollTo(0, 0)
    setView({ kind: 'home' })
  }, [view, setStories])

  if (!ready)
    return (
      <div className="workspace-loading" role="status">
        Opening Folio…
      </div>
    )
  const saveNotice = saveError && (
    <div className="save-notice" role="alert">
      {saveError}
      <button
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(stories, null, 2)], { type: 'application/json' }),
          )
          const link = document.createElement('a')
          link.href = url
          link.download = 'folio-backup.json'
          link.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }}
      >
        Export backup
      </button>
    </div>
  )
  if (view.kind === 'write') {
    const story = stories.find((s) => s.id === view.id)
    if (story)
      return (
        <>
          {saveNotice}
          <Write
            key={story.id}
            story={story}
            isNew={view.isNew}
            ai={ai}
            upStory={(fn, why) => upStory(story.id, fn, why)}
            upBlock={(bid, fn, why) => upBlock(story.id, bid, fn, why)}
            goHome={goHome}
            saveError={saveError}
            saving={saving}
          />
        </>
      )
  }
  return (
    <>
      {saveNotice}
      <Home
        stories={stories}
        setStories={setStories}
        theme={homeTheme}
        pickTheme={pickHomeTheme}
        ai={ai}
        onOpen={open}
      />
    </>
  )
}
