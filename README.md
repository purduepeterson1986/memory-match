# Memory Match

A card-matching memory game for 2 to 4 players, played in any web browser with a mouse or a touch screen.

**Play it here:** https://purduepeterson1986.github.io/memory-match/

## How to play

1. Choose the number of players, a difficulty and a card type, then press **Start game**.
2. On your turn, flip two cards.
3. If they match, you keep the pair and go again.
4. If they don't match, the cards flip back and the next player takes a turn.
5. When every pair has been found, the player with the most pairs wins.

## Settings

- **Players:** 2, 3 or 4. Each player can be a **Person** or the **Computer**. Names are optional.
- **Computer skill:** Easy, Medium or Hard. The computer remembers some of the cards it has seen. Easy forgets most of them, Hard remembers nearly all of them.
- **Difficulty:** sets the number of cards.

  | Level | Cards |
  |---|---|
  | Easy | 16 |
  | Medium | 24 |
  | Hard | 36 |
  | Expert | 48 |
  | Master | 64 |

- **Card type:** Animals, Shapes, Pictures, Food, Emoji Faces, Sports, Flags, Math, or Lord of the Rings characters.
- **Math level:** shown when the Math card type is selected. Two cards match when they have the same answer, for example `1 + 4` and `2 + 3`.

  | Math level | Problems |
  |---|---|
  | Level 1 | Addition |
  | Level 2 | Addition and subtraction |
  | Level 3 | Multiplication |
  | Level 4 | Division |
  | Level 5 | Two steps, including brackets |

## Features

- Scores for every player are always visible, with the current player highlighted.
- The board arranges itself to fit the screen, from a phone to a large touch-screen monitor.
- Sound effects with a mute button, and a full-screen button.
- Can be installed as an app from the browser.
- Settings are remembered between visits.

## Running it yourself

No installation or build step is needed. Download the files and open `index.html` in a browser.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page |
| `styles.css` | Appearance and animations |
| `game.js` | Game rules, settings and scoring |
| `themes.js` | The picture card sets |
| `math.js` | Generates the math problems |
| `manifest.json`, `icon-192.png`, `icon-512.png` | Lets the game be installed as an app |
