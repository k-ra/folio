import type { ChatMessage, Story } from '../types'
import { DEF_STYLE } from '../constants'

export const CHAT_PLAYGROUND_ID = 's-offline-chat'

const closeReading = `*Offline sample commentary — written for interface testing, not generated or researched live.*

## A room that changes without moving

The strongest part of this essay is its scale. Nothing spectacular happens: a cup stays on a table, a rectangle of light travels across a wall, and the narrator returns to the same room. Yet those small changes give the piece a way to think about attention without beginning with a definition of attention. The reader gets to experience the argument before being asked to agree with it.

**The room is not the subject so much as the instrument.** It lets you measure a change in how someone sees. That distinction could guide the revision. Whenever a sentence explains what attention is, ask whether a concrete detail could carry the same thought more lightly. You do not have to remove abstraction; you can make it arrive after the reader has something to hold.

### 1. Let the opening stay small

The opening image works because it does not announce its importance. A cup, a table, a narrow stripe of sunlight: these are ordinary enough to invite a reader in. Adding a grand claim about modern life at this point would make the paragraph less confident, not more. It would ask the reader to admire the topic before discovering the scene.

Try listening for the point where observation turns into explanation. You might keep the observation in the main column and put the explanation in a margin note, at least while drafting. Then read the page with the margin temporarily ignored. Does the scene still imply the question you care about? If it does, the explanatory sentence may belong later. If it does not, that is useful information rather than a failure.

### 2. Give repetition a small difference

Returning to the room is already a structural decision. The second visit should not simply repeat the first description, but it also does not need to introduce a dramatic event. A shift in temperature, a different sound outside, or the disappearance of the light could be enough. The repeated setting makes a slight difference legible.

Consider three kinds of change:

- **The room changes:** the light moves, the cup is empty, a door is open.
- **The observer changes:** something that seemed incidental becomes the center of the description.
- **The language changes:** a sentence returns with one word altered, allowing the form to register a new understanding.

These are alternatives, not a checklist. One carefully chosen difference may do more than several new details. The test is whether the second visit deepens the first rather than replacing it with a new scene.

### 3. Keep a productive uncertainty

The essay seems interested in whether attention is a practice or a feeling. That tension is worth preserving. A practice can be repeated even when it does not feel rewarding. A feeling arrives unevenly and cannot be summoned just by putting a cup in the right place. Your narrator can move between those possibilities without settling them immediately.

> A useful revision question: what can the narrator do again tomorrow, and what can they only hope will happen?

This question gives the essay a modest kind of stakes. It is not asking whether observation will solve a life. It is asking whether a small repeated action can change the texture of a day. That is a claim the scale of the room can support.

### 4. Let the ending return, rather than conclude

The final paragraph may not need a summary. A return to the cup could be enough, provided the reader sees it differently after the middle of the essay. Perhaps the cup has not moved at all. The change belongs to the person noticing it. You can make that felt through the choice of detail rather than by stating that a transformation has occurred.

Read the last two sentences separately. If the first leaves a resonant image and the second translates it into a lesson, try ending on the first. Keep the second in your notes; it may contain the thought that helped you write the piece, even if it is not the sentence a reader needs at the end.

Nothing here requires rewriting the essay in another voice. These are ways of testing the shape you already have: **keep the scene, vary the return, and leave a little space around the meaning.**`

const revisionMap = `*Offline sample — a second long reply for testing the conversation.*

## A gentle revision map

I would work in passes, with a different question for each pass. Trying to improve the image, the argument, the rhythm, and the ending simultaneously can make every sentence feel provisional. A small sequence of passes lets you notice what is already working before changing it.

### First pass: only the images

Underline the concrete things a reader could point to: cup, window, table, wall, light. Then circle the verbs attached to them. Which images move? Which are still? If everything is still, the light can supply motion. If everything moves, the cup can provide a point of rest. You are composing a relationship, not simply adding description.

Leave the abstract sentences alone for this pass. The purpose is not to eliminate them, but to see whether the essay has a physical world sturdy enough to support them. A single exact verb can be more useful than a new paragraph of atmosphere. Notice how “crosses,” “rests,” and “reaches” would give the same stripe of light different kinds of agency.

### Second pass: the distance between claims

Look at where the essay makes a general statement. What immediately precedes it? A reader should be able to see how the thought arose, even if they do not reach precisely the same conclusion. If a claim appears without a nearby observation, consider moving it rather than deleting it. Its problem may be position, not content.

| Passage | Revision question |
| --- | --- |
| Opening room | Can the reader enter before being told what to think? |
| Return to the window | What is different this time? |
| Reflection on attention | Which detail earned this thought? |
| Final cup | Can the image carry the ending? |

These questions are deliberately narrower than “is this good?” They give you something to test. If an edit does not help answer the question for that pass, you can postpone it. Revision becomes a series of choices rather than a verdict on the whole piece.

### Third pass: read for breath

Read the essay aloud once without stopping to fix anything. Mark the places where you naturally pause, accelerate, or lose the thread. On the next reading, compare those marks with the punctuation. A long sentence can be wonderfully clear if its internal movement is audible. A short sentence can still feel crowded if it carries several competing ideas.

You might want the first paragraph to move slowly, the middle to gather a little momentum, and the ending to settle. That does not mean making every sentence match a template. It means listening to the contrast between them. A sentence that feels plain on its own may be exactly the pause a neighboring sentence needs.

### Fourth pass: protect what is yours

Make a small list of phrases you would be sorry to lose. They may be awkward, intimate, funny, or unusually precise. Do not assume a smoother version is automatically better. Sometimes the hesitation in a sentence is part of the thinking. The goal is to make that thinking legible, not to remove every trace of its formation.

If you try an alternative ending, keep the original beside it. Read both after a break. Ask which one sounds like a discovery made within this particular room, rather than a lesson borrowed from elsewhere. You may end up restoring the original. That still counts as useful revision: now you know what it was doing.

**For the next ten minutes:** change one transition, test one repeated image, and leave the opening alone. Then stop and read. The essay does not need to become a different essay to become more fully itself.`

export const SAMPLE_CHAT: ChatMessage[] = [
  { me: true, text: 'Could you give me a close reading of this little essay? I want to keep my own voice.' },
  { me: false, text: closeReading },
  { me: true, text: 'Could you give me a revision map without rewriting the paragraphs?' },
  { me: false, text: revisionMap },
]

export function chatPlayground(): Story {
  return {
    id: CHAT_PLAYGROUND_ID,
    title: 'Chat playground',
    date: 'OFFLINE SAMPLE',
    thumb: 'lines',
    style: { ...DEF_STYLE },
    chatSettings: { offlineSample: true, browsing: false },
    blocks: [
      {
        id: 'room-a',
        type: 'text',
        text: 'Every morning, the light reaches the cup before I do. It crosses the table in a thin rectangle, catching the handle and leaving the rest in shade. I used to think of the room as unchanged. Now I suspect I was simply arriving too quickly to see it.',
      },
      {
        id: 'room-b',
        type: 'text',
        text: 'The next day I leave the cup where it is. Outside, a delivery van stops and moves on. The rectangle has shifted by the time I look up. Nothing in the room asks to be noticed, which may be why noticing it feels different from answering a question.',
      },
      {
        id: 'room-c',
        type: 'text',
        text: 'I do not know whether this is a practice yet. Some mornings I forget. On others I remember only after the light has gone. The cup remains on the table, holding a small, ordinary place for my return.',
      },
    ],
    notes: {
      'room-b': 'Fictional sample. Try highlighting a passage in the essay or chat and saving it to INDEX.',
    },
    chats: { chat: SAMPLE_CHAT.map((m) => ({ ...m })) },
    history: [],
  }
}

/** Deliberately canned: no connection, provider request, research or essay mutation. */
export function offlineChatReply(turn: number) {
  return SAMPLE_CHAT[turn % 2 ? 1 : 3].text
}
