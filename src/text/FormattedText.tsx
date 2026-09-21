import { Fragment, type ReactNode } from 'react'
import { textSegments, type TextMark } from './formatting'
export default function FormattedText({ text, marks }: { text: string; marks?: TextMark[] }) {
  return (
    <>
      {textSegments(text, marks).map((s, i) => {
        let content: ReactNode = s.text
        for (const kind of s.kinds)
          content =
            kind === 'bold' ? (
              <strong>{content}</strong>
            ) : kind === 'italic' ? (
              <em>{content}</em>
            ) : kind === 'underline' ? (
              <u>{content}</u>
            ) : kind === 'strike' ? (
              <s>{content}</s>
            ) : (
              <code>{content}</code>
            )
        return <Fragment key={i}>{content}</Fragment>
      })}
    </>
  )
}
