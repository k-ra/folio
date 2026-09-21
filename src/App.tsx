import { useCallback, useState } from 'react'
import { simulated } from './ai'
import Home from './home/Home'
import { useHomeTheme, useStories } from './model/store'
import Write from './write/Write'
import { AccountProvider, useAccount } from './cloud/Auth'
import { useCloud } from './cloud/useCloud'
import { WorkspaceActions } from './portable/InfoActions'
import { saveWorkspace } from './model/storage'
import { newId } from './model/util'
import { backup } from './portable/backup'

const ai = simulated

export default function App({ initialStoryId }: { initialStoryId?: string }) {
  return (
    <AccountProvider>
      <AccountWorkspace initialStoryId={initialStoryId} />
    </AccountProvider>
  )
}
function AccountWorkspace({ initialStoryId }: { initialStoryId?: string }) {
  const { user, ready } = useAccount()
  if (!ready)
    return (
      <div className="workspace-loading" role="status">
        Opening Folio…
      </div>
    )
  return <Workspace key={user?.id || 'browser'} owner={user?.id} initialStoryId={initialStoryId} />
}
function Workspace({ initialStoryId, owner }: { initialStoryId?: string; owner?: string }) {
  const { stories, setStories, upStory, upBlock, ready, saveError, saving } = useStories(owner)
  const cloud = useCloud(owner, stories, setStories, ready)
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

  const actions = {
    cloud,
    flush: () => saveWorkspace(stories, owner),
    importStory: (incoming: import('./model/types').Story) => {
      const same = stories.find((s) => s.id === incoming.id)
      if (same && backup(same) === backup(incoming)) {
        open(same.id, false)
        return
      }
      const next = same ? { ...incoming, id: newId() } : incoming
      setStories((arr) => [next, ...arr])
      open(next.id, false)
    },
  }
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
            new Blob([JSON.stringify(stories, null, 2)], {
              type: 'application/json',
            }),
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
        <WorkspaceActions.Provider value={actions}>
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
            cloudStatus={owner ? cloud.status : undefined}
          />
        </WorkspaceActions.Provider>
      )
  }
  return (
    <WorkspaceActions.Provider value={actions}>
      {saveNotice}
      <Home
        stories={stories}
        setStories={setStories}
        theme={homeTheme}
        pickTheme={pickHomeTheme}
        ai={ai}
        onOpen={open}
      />
    </WorkspaceActions.Provider>
  )
}
