# Flip Fella TV

The Flip Fella flip clock as an app for a Samsung Tizen TV (built for a 2016 UE49KU6500). Big flip cards fill the top of the screen and your character sits underneath on the left, centre or right, glancing up at the time and hopping to a new spot every minute or two.

## Remote

| Button | Does |
| --- | --- |
| Left / Right | Switch between Pebble, Drip and Bean (remembered) |
| OK | Hop to another spot |
| Up | A little cheer |
| Down | Next radio station |
| Play/Pause | Music on or off (remembered) |
| Return | Close the app |

The character jumps when the minute flips, cheers on the hour, yawns now and then, and dozes with the screen dimmed from 10pm to 7am. The app asks the TV to keep its own screen saver off while it's open.

## Music

The app plays lofi and chilled instrumental radio while it runs, so it comes through the TV's speakers or soundbar. Stations: SomaFM Fluid (default), 24/7 Lofi Radio, Chill Hop and SomaFM Groove Salad. If a station drops, it moves to the next one on its own. Edit `STATIONS` in `app/clock.js` to change the list. In a browser, tap once to start the sound.

## Install

1. TV: Apps, type 12345 on the remote, turn Developer Mode on, enter your PC's IP, restart the TV.
2. PC: download `FlipFellaTV.wgt` from the "latest" release.
3. PC: open Apps2Samsung, select the TV, choose a custom .wgt, pick the file, Install.

Flip Fella then sits in My Apps like any other app. To update, install the new `.wgt` the same way.

## Building

GitHub Actions checks that the code parses as ES5 (the TV's browser engine is old), zips `app/` into `FlipFellaTV.wgt` and publishes it to the "latest" release on every push to `main`.

`app/index.html` also runs in any browser. Add `?at=23:15` to fake the time or `?kind=drip` to pick a character. `tools/glyphs.py` regenerates `app/glyphs.js` from flip-fella-desk's glyph data.
