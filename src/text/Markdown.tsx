import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './text.css'

/** Model output is prose, never trusted HTML. Images cannot trigger remote requests. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="folio-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          img: ({ alt }) => <span>{alt}</span>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
