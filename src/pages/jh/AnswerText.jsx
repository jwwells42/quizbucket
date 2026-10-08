// Renders a packet answer line, with the **required** portion bold + underlined
// the way it appears in the printed packet.
export default function AnswerText({ answer, className = '' }) {
  const parts = answer.display.split('**')
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <b key={i} className="font-semibold underline underline-offset-2">{part}</b>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}
