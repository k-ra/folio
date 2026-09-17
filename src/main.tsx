import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Playground from './magic/Playground'
import { MOCK_ESSAY_ID } from './model/samples/mockEssay'
import './styles.css'
import '@fontsource/instrument-sans/latin-400.css'
import './magic/magic.css'
import './style/controls.css'

const params = new URLSearchParams(location.search)
const legacyPlayground = params.get('demo') === 'magic'
// Old review links now open the ordinary saved story. Only automated QA needs isolation.
if (legacyPlayground) window.history.replaceState(null, '', location.pathname)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {params.get('qa') === 'essay' ? (
      <Playground />
    ) : (
      <App initialStoryId={legacyPlayground ? MOCK_ESSAY_ID : undefined} />
    )}
  </React.StrictMode>,
)
